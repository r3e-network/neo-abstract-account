const { rpc, tx, wallet, sc, u } = require('@cityofzion/neon-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { sanitizeHex } = require('../src/metaTx');

const rpcUrl = 'https://testnet1.neo.coz.io:443';
const rpcClient = new rpc.RPCClient(rpcUrl);

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

function toHexFromStackByteString(item) {
  if (!item || item.type !== 'ByteString' || !item.value) return '';
  return Buffer.from(item.value, 'base64').toString('hex').toLowerCase();
}

async function invokeRead(aaHash, operation, args = [], signers = []) {
  const script = sc.createScript({
    scriptHash: aaHash,
    operation,
    args
  });
  const res = await rpcClient.invokeScript(u.HexString.fromHex(script), signers);
  if (res.state === 'FAULT') {
    throw new Error(`${operation} fault: ${res.exception}`);
  }
  return res;
}

async function waitForTx(txid, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const appLog = await rpcClient.getApplicationLog(txid);
      if (appLog && Array.isArray(appLog.executions) && appLog.executions.length > 0) {
        return appLog;
      }
    } catch (_) {
      // pending
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`Timed out waiting for tx confirmation: ${txid}`);
}

async function sendInvocation({ account, magic, aaHash, operation, args }) {
  const script = sc.createScript({ scriptHash: aaHash, operation, args });
  const signers = [{ account: account.scriptHash, scopes: tx.WitnessScope.CalledByEntry }];

  const currentHeight = await rpcClient.getBlockCount();
  const sim = await rpcClient.invokeScript(u.HexString.fromHex(script), signers);
  if (sim.state === 'FAULT') {
    throw new Error(`${operation} simulation fault: ${sim.exception}`);
  }

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
  return {
    txid,
    systemFee: sim.gasconsumed,
    networkFee: networkFee?.toString?.() || String(networkFee),
  };
}

async function getGasBalance(address) {
  const result = await rpcClient.execute(new rpc.Query({
    method: 'getnep17balances',
    params: [address],
  }));
  const balances = result?.balance || [];
  const gas = balances.find((b) => sanitizeHex(b.assethash) === 'd2a4cff31913016155e38e474a2c06d08be276cf');
  return gas ? gas.amount : '0';
}

async function main() {
  const wif = process.env.TEST_WIF;
  if (!wif) throw new Error('TEST_WIF is required');

  const repoRoot = process.cwd();
  const envValues = parseEnvFile(path.join(repoRoot, '.env'));
  const aaHashRaw = process.env.AA_HASH_TESTNET || envValues.VITE_AA_HASH_TESTNET || '';
  const aaHash = sanitizeHex(aaHashRaw);
  if (!/^[0-9a-f]{40}$/.test(aaHash)) {
    throw new Error(`Invalid testnet AA hash: ${aaHashRaw}`);
  }

  const account = new wallet.Account(wif);
  const version = await rpcClient.execute(new rpc.Query({ method: 'getversion' }));
  const magic = version?.protocol?.network;
  if (!magic) throw new Error('Unable to resolve testnet network magic');

  const gasBalance = await getGasBalance(account.address);

  // Unique 16-byte accountId
  const accountId = crypto.randomBytes(16).toString('hex');

  // Compute proxy AA address: verify(accountId)
  const verifyScript = sc.createScript({
    scriptHash: aaHash,
    operation: 'verify',
    args: [sc.ContractParam.byteArray(u.HexString.fromHex(accountId, false))],
  });
  const accountAddressScriptHash = sanitizeHex(u.reverseHex(u.hash160(verifyScript)));
  const accountAddress = wallet.getAddressFromScriptHash(accountAddressScriptHash);

  const idBeforeRes = await invokeRead(
    aaHash,
    'getAccountIdByAddress',
    [sc.ContractParam.hash160(accountAddressScriptHash)]
  );
  const accountIdBefore = toHexFromStackByteString(idBeforeRes.stack[0]);

  const create = await sendInvocation({
    account,
    magic,
    aaHash,
    operation: 'createAccountWithAddress',
    args: [
      sc.ContractParam.byteArray(u.HexString.fromHex(accountId, false)),
      sc.ContractParam.hash160(accountAddressScriptHash),
      sc.ContractParam.array(sc.ContractParam.hash160(sanitizeHex(account.scriptHash))),
      sc.ContractParam.integer(1),
      sc.ContractParam.array(),
      sc.ContractParam.integer(0),
    ],
  });

  const appLog = await waitForTx(create.txid);
  const vmState = appLog.executions?.[0]?.vmstate || appLog.executions?.[0]?.vmState || 'UNKNOWN';
  if (String(vmState).toUpperCase() !== 'HALT') {
    throw new Error(`createAccountWithAddress tx vmstate not HALT: ${vmState}`);
  }

  const getIdRes = await invokeRead(
    aaHash,
    'getAccountIdByAddress',
    [sc.ContractParam.hash160(accountAddressScriptHash)]
  );
  const resolvedAccountId = toHexFromStackByteString(getIdRes.stack[0]);

  const getAddrRes = await invokeRead(
    aaHash,
    'getAccountAddress',
    [sc.ContractParam.byteArray(u.HexString.fromHex(accountId, false))]
  );
  const resolvedAccountAddressHash = toHexFromStackByteString(getAddrRes.stack[0]);
  const normalizedResolvedAccountId = resolvedAccountId ? sanitizeHex(u.reverseHex(resolvedAccountId)) : '';
  const normalizedResolvedAccountAddressHash = resolvedAccountAddressHash
    ? sanitizeHex(u.reverseHex(resolvedAccountAddressHash))
    : '';

  const adminsAfterRes = await invokeRead(
    aaHash,
    'getAdminsByAddress',
    [sc.ContractParam.hash160(accountAddressScriptHash)]
  );
  const adminThresholdRes = await invokeRead(
    aaHash,
    'getAdminThresholdByAddress',
    [sc.ContractParam.hash160(accountAddressScriptHash)]
  );

  const adminsAfter = adminsAfterRes?.stack?.[0]?.value || [];
  const adminThreshold = adminThresholdRes?.stack?.[0]?.value;

  const result = {
    rpcUrl,
    aaHash: `0x${aaHash}`,
    ownerAddress: account.address,
    ownerScriptHash: `0x${sanitizeHex(account.scriptHash)}`,
    ownerGasBalance: gasBalance,
    createdAccount: {
      accountIdHex: accountId,
      accountAddress,
      accountAddressScriptHash: `0x${accountAddressScriptHash}`,
    },
    tx: create,
    checks: {
      accountIdBeforeHex: accountIdBefore || null,
      adminsAfterCount: Array.isArray(adminsAfter) ? adminsAfter.length : null,
      adminThreshold,
      accountIdReadRawHex: resolvedAccountId || null,
      accountAddressReadRawHex: resolvedAccountAddressHash || null,
      accountIdBindingMatches: normalizedResolvedAccountId === accountId,
      accountAddressBindingMatches: normalizedResolvedAccountAddressHash === accountAddressScriptHash,
    },
  };

  console.log(JSON.stringify(result, null, 2));

  if (!result.checks.accountIdBindingMatches || !result.checks.accountAddressBindingMatches) {
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error('[AA testnet integration] FAILED');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
