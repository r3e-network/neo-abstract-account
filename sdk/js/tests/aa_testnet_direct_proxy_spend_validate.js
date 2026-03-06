const { rpc, tx, wallet, sc, u } = require('@cityofzion/neon-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rpcUrl = 'https://testnet1.neo.coz.io:443';
const rpcClient = new rpc.RPCClient(rpcUrl);
const GAS_TOKEN_HASH = 'd2a4cff31913016155e38e474a2c06d08be276cf';

function sanitizeHex(value) {
  return String(value || '').replace(/^0x/i, '').toLowerCase();
}

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return out;
}

function randomAccountIdHex(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex');
}

function cpHash160(hex) {
  return sc.ContractParam.hash160(sanitizeHex(hex));
}

function cpByteArray(hex) {
  return sc.ContractParam.byteArray(u.HexString.fromHex(sanitizeHex(hex), false));
}

function cpArray(items = []) {
  return sc.ContractParam.array(...items);
}

function deriveAaAddressFromId(aaHash, accountIdHex) {
  const verificationScript = sc.createScript({
    scriptHash: aaHash,
    operation: 'verify',
    args: [cpByteArray(accountIdHex)],
  });
  const addressScriptHash = sanitizeHex(u.reverseHex(u.hash160(verificationScript)));
  return {
    verificationScript,
    addressScriptHash,
    address: wallet.getAddressFromScriptHash(addressScriptHash),
  };
}

async function waitForTx(txid, timeoutMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const appLog = await rpcClient.getApplicationLog(txid);
      if (appLog?.executions?.length) return appLog;
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  throw new Error(`Timed out waiting for tx ${txid}`);
}

async function sendInvocation({ account, magic, scriptHash, operation, args }) {
  const signers = [{ account: account.scriptHash, scopes: tx.WitnessScope.CalledByEntry }];
  const script = sc.createScript({ scriptHash, operation, args });
  const sim = await rpcClient.invokeScript(u.HexString.fromHex(script), signers);
  if (sim.state === 'FAULT') {
    throw new Error(`${operation} simulation fault: ${sim.exception}`);
  }

  const currentHeight = await rpcClient.getBlockCount();
  let transaction = new tx.Transaction({
    signers,
    validUntilBlock: currentHeight + 1000,
    script,
    systemFee: sim.gasconsumed || '1000000',
  });
  transaction.sign(account, magic);

  const networkFee = await rpcClient.calculateNetworkFee(transaction);
  transaction = new tx.Transaction({
    signers,
    validUntilBlock: currentHeight + 1000,
    script,
    systemFee: sim.gasconsumed || '1000000',
    networkFee,
  });
  transaction.sign(account, magic);

  const txid = await rpcClient.sendRawTransaction(transaction);
  return waitForTx(txid);
}

async function main() {
  const repoRoot = path.resolve(__dirname, '../../..');
  const envValues = parseEnvFile(path.join(repoRoot, '.env'));
  const aaHashRaw = process.env.AA_HASH_TESTNET || envValues.VITE_AA_HASH_TESTNET || '';
  const aaHash = sanitizeHex(aaHashRaw);
  if (!/^[0-9a-f]{40}$/.test(aaHash)) throw new Error(`Invalid testnet AA hash: ${aaHashRaw}`);

  const wif = process.env.TEST_WIF;
  if (!wif) throw new Error('TEST_WIF required');

  const owner = new wallet.Account(wif);
  const recipient = new wallet.Account();
  const expectedBlocked = process.env.EXPECT_PROXY_SPEND_BLOCKED !== '0';
  const fundingAmount = 400000000;
  const spendAmount = 200000000;

  const version = await rpcClient.execute(new rpc.Query({ method: 'getversion' }));
  const magic = version?.protocol?.network;
  if (!magic) throw new Error('Missing network magic');

  const accountIdHex = randomAccountIdHex(16);
  const accountInfo = deriveAaAddressFromId(aaHash, accountIdHex);

  await sendInvocation({
    account: owner,
    magic,
    scriptHash: aaHash,
    operation: 'createAccountWithAddress',
    args: [
      cpByteArray(accountIdHex),
      cpHash160(accountInfo.addressScriptHash),
      cpArray([cpHash160(owner.scriptHash)]),
      sc.ContractParam.integer(1),
      cpArray([]),
      sc.ContractParam.integer(0),
    ],
  });

  await sendInvocation({
    account: owner,
    magic,
    scriptHash: GAS_TOKEN_HASH,
    operation: 'transfer',
    args: [
      cpHash160(owner.scriptHash),
      cpHash160(accountInfo.addressScriptHash),
      sc.ContractParam.integer(fundingAmount),
      sc.ContractParam.any(null),
    ],
  });

  const script = sc.createScript({
    scriptHash: GAS_TOKEN_HASH,
    operation: 'transfer',
    args: [
      cpHash160(accountInfo.addressScriptHash),
      cpHash160(recipient.scriptHash),
      sc.ContractParam.integer(spendAmount),
      sc.ContractParam.any(null),
    ],
  });

  const signers = [
    { account: owner.scriptHash, scopes: tx.WitnessScope.CalledByEntry },
    { account: accountInfo.addressScriptHash, scopes: tx.WitnessScope.CustomContracts, allowedContracts: [GAS_TOKEN_HASH] },
  ];
  const witnesses = [{ invocationScript: '', verificationScript: accountInfo.verificationScript }];

  const currentHeight = await rpcClient.getBlockCount();
  let transaction = new tx.Transaction({
    signers,
    validUntilBlock: currentHeight + 1000,
    script,
    systemFee: '100000000',
    witnesses,
  });
  transaction.sign(owner, magic);

  const networkFee = await rpcClient.calculateNetworkFee(transaction);
  transaction = new tx.Transaction({
    signers,
    validUntilBlock: currentHeight + 1000,
    script,
    systemFee: '100000000',
    networkFee,
    witnesses,
  });
  transaction.sign(owner, magic);

  try {
    const txid = await rpcClient.sendRawTransaction(transaction);
    const appLog = await waitForTx(txid, 30000);
    const result = {
      aaHash: `0x${aaHash}`,
      expectedBlocked,
      blocked: false,
      txid,
      vmState: String(appLog.executions?.[0]?.vmstate || appLog.executions?.[0]?.vmState || 'UNKNOWN').toUpperCase(),
      stack: appLog.executions?.[0]?.stack || [],
      accountAddress: accountInfo.address,
      recipientAddress: recipient.address,
    };
    console.log(JSON.stringify(result, null, 2));
    if (expectedBlocked) {
      throw new Error('Direct proxy-signed external spend unexpectedly succeeded');
    }
  } catch (error) {
    const message = error?.message || String(error);
    const result = {
      aaHash: `0x${aaHash}`,
      expectedBlocked,
      blocked: true,
      message,
      accountAddress: accountInfo.address,
      recipientAddress: recipient.address,
    };
    console.log(JSON.stringify(result, null, 2));
    if (!expectedBlocked) {
      throw error;
    }
  }
}

main().catch((error) => {
  console.error('[aa_testnet_direct_proxy_spend_validate] FAILED');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
