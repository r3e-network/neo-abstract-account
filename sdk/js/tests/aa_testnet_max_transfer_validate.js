const { rpc, tx, wallet, sc, u } = require('@cityofzion/neon-js');
const path = require('path');
const crypto = require('crypto');
const { parseEnvFile } = require('./env');
const { waitForTx, sendTransaction } = require('./tx');
const { sanitizeHex } = require('../src/metaTx');

const rpcUrl = 'https://testnet1.neo.coz.io:443';
const rpcClient = new rpc.RPCClient(rpcUrl);
const GAS_TOKEN_HASH = 'd2a4cff31913016155e38e474a2c06d08be276cf';

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
    addressScriptHash,
    address: wallet.getAddressFromScriptHash(addressScriptHash),
    verificationScript,
  };
}

function buildAaExecutionContext(aaHash, ownerScriptHash, accountInfo) {
  return {
    signers: [
      { account: ownerScriptHash, scopes: tx.WitnessScope.CalledByEntry },
      {
        account: accountInfo.addressScriptHash,
        scopes: tx.WitnessScope.CustomContracts,
        allowedContracts: [sanitizeHex(aaHash), GAS_TOKEN_HASH],
      },
    ],
    witnesses: [
      {
        invocationScript: '',
        verificationScript: accountInfo.verificationScript,
      },
    ],
  };
}

async function sendInvocation({
  account,
  magic,
  scriptHash,
  operation,
  args,
  witnessScope = tx.WitnessScope.CalledByEntry,
  signers,
  witnesses = [],
}) {
  const resolvedSigners = signers || [{ account: account.scriptHash, scopes: witnessScope }];
  const script = sc.createScript({ scriptHash, operation, args });

  const sim = await rpcClient.invokeScript(u.HexString.fromHex(script), resolvedSigners);
  if (sim.state === 'FAULT') {
    throw new Error(`${operation} simulation fault: ${sim.exception}`);
  }

  const currentHeight = await rpcClient.getBlockCount();
  const { txid, networkFee } = await sendTransaction({
    rpcClient,
    txModule: tx,
    account,
    magic,
    signers: resolvedSigners,
    validUntilBlock: currentHeight + 1000,
    script,
    systemFee: sim.gasconsumed || '1000000',
    witnesses,
  });
  const appLog = await waitForTx(rpcClient, txid);

  if (vmState !== 'HALT') {
    throw new Error(`${operation} tx vmstate ${vmState}`);
  }

  return {
    txid,
    systemFee: sim.gasconsumed,
    networkFee,
    appLog,
  };
}

async function simulate(aaHash, operation, args = [], signers = []) {
  const script = sc.createScript({ scriptHash: aaHash, operation, args });
  return rpcClient.invokeScript(u.HexString.fromHex(script), signers);
}

async function getAssetBalance(address, assetHash) {
  const result = await rpcClient.execute(new rpc.Query({ method: 'getnep17balances', params: [address] }));
  const balances = result?.balance || [];
  const match = balances.find((item) => sanitizeHex(item.assethash) === sanitizeHex(assetHash));
  return BigInt(match?.amount || '0');
}

function buildExecuteByAddressTransferArgs(accountAddressHash, recipientScriptHash, amount) {
  return [
    cpHash160(accountAddressHash),
    cpHash160(GAS_TOKEN_HASH),
    sc.ContractParam.string('transfer'),
    cpArray([
      cpHash160(accountAddressHash),
      cpHash160(recipientScriptHash),
      sc.ContractParam.integer(Number(amount)),
      sc.ContractParam.any(null),
    ]),
  ];
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
  const version = await rpcClient.execute(new rpc.Query({ method: 'getversion' }));
  const magic = version?.protocol?.network;
  if (!magic) throw new Error('Missing network magic');

  const summary = {
    rpcUrl,
    aaHash: `0x${aaHash}`,
    ownerAddress: owner.address,
    ownerScriptHash: `0x${sanitizeHex(owner.scriptHash)}`,
    recipientAddress: recipient.address,
    recipientScriptHash: `0x${sanitizeHex(recipient.scriptHash)}`,
    txs: [],
    checks: [],
  };

  const check = (name, condition, details = null) => {
    summary.checks.push({ name, pass: !!condition, details });
    if (!condition) {
      throw new Error(`Check failed: ${name}${details ? ` :: ${details}` : ''}`);
    }
  };

  const accountIdHex = randomAccountIdHex(16);
  const accountInfo = deriveAaAddressFromId(aaHash, accountIdHex);
  const executionContext = buildAaExecutionContext(aaHash, owner.scriptHash, accountInfo);
  summary.account = {
    accountIdHex,
    accountAddress: accountInfo.address,
    accountAddressScriptHash: `0x${accountInfo.addressScriptHash}`,
  };
  summary.executionContext = {
    senderScriptHash: `0x${sanitizeHex(owner.scriptHash)}`,
    senderPaysFees: true,
    signers: executionContext.signers.map((signer) => ({
      account: `0x${sanitizeHex(signer.account)}`,
      scopes: signer.scopes,
      allowedContracts: Array.isArray(signer.allowedContracts)
        ? signer.allowedContracts.map((hash) => `0x${sanitizeHex(hash)}`)
        : undefined,
    })),
  };

  summary.txs.push({
    step: 'createAccountWithAddress(max-transfer)',
    ...(await sendInvocation({
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
    })),
  });

  const fundingAmount = 300000000n;
  const allowedAmount = 100000000n;
  const blockedAmount = 200000000n;

  const balanceOwnerBefore = await getAssetBalance(owner.address, GAS_TOKEN_HASH);
  const balanceAccountBefore = await getAssetBalance(accountInfo.address, GAS_TOKEN_HASH);
  const balanceRecipientBefore = await getAssetBalance(recipient.address, GAS_TOKEN_HASH);

  summary.txs.push({
    step: 'fund account address with GAS',
    ...(await sendInvocation({
      account: owner,
      magic,
      scriptHash: GAS_TOKEN_HASH,
      operation: 'transfer',
      args: [
        cpHash160(owner.scriptHash),
        cpHash160(accountInfo.addressScriptHash),
        sc.ContractParam.integer(Number(fundingAmount)),
        sc.ContractParam.any(null),
      ],
    })),
  });

  const balanceAccountFunded = await getAssetBalance(accountInfo.address, GAS_TOKEN_HASH);
  check('account funded with expected GAS delta', balanceAccountFunded - balanceAccountBefore === fundingAmount, `${balanceAccountFunded - balanceAccountBefore}`);

  summary.txs.push({
    step: 'setMaxTransferByAddress(GAS,1 GAS)',
    ...(await sendInvocation({
      account: owner,
      magic,
      scriptHash: aaHash,
      operation: 'setMaxTransferByAddress',
      args: [cpHash160(accountInfo.addressScriptHash), cpHash160(GAS_TOKEN_HASH), sc.ContractParam.integer(Number(allowedAmount))],
    })),
  });

  const blockedArgs = buildExecuteByAddressTransferArgs(accountInfo.addressScriptHash, recipient.scriptHash, blockedAmount);
  const blockedSim = await simulate(aaHash, 'executeByAddress', blockedArgs, executionContext.signers);
  summary.blockedSimulation = { state: blockedSim.state, exception: blockedSim.exception || null };
  check('over-limit transfer faults', blockedSim.state === 'FAULT', blockedSim.exception || 'expected FAULT');
  check('over-limit fault reason matches', String(blockedSim.exception || '').includes('Amount exceeds max limit'), blockedSim.exception || '');

  const balanceAccountAfterBlocked = await getAssetBalance(accountInfo.address, GAS_TOKEN_HASH);
  const balanceRecipientAfterBlocked = await getAssetBalance(recipient.address, GAS_TOKEN_HASH);
  check('blocked transfer leaves account balance unchanged', balanceAccountAfterBlocked === balanceAccountFunded, `${balanceAccountAfterBlocked}`);
  check('blocked transfer leaves recipient balance unchanged', balanceRecipientAfterBlocked === balanceRecipientBefore, `${balanceRecipientAfterBlocked}`);

  const allowedArgs = buildExecuteByAddressTransferArgs(accountInfo.addressScriptHash, recipient.scriptHash, allowedAmount);
  const allowedSim = await simulate(aaHash, 'executeByAddress', allowedArgs, executionContext.signers);
  summary.allowedSimulation = { state: allowedSim.state, exception: allowedSim.exception || null, stack: allowedSim.stack || [] };
  check('at-limit transfer simulation HALTs', allowedSim.state === 'HALT', allowedSim.exception || '');
  check('allowed transfer simulation returns true', allowedSim.stack?.[0]?.type === 'Boolean' && allowedSim.stack?.[0]?.value === true, JSON.stringify(allowedSim.stack || []));

  const allowedTx = await sendInvocation({
    account: owner,
    magic,
    scriptHash: aaHash,
    operation: 'executeByAddress',
    args: allowedArgs,
    signers: executionContext.signers,
    witnesses: executionContext.witnesses,
  });
  summary.txs.push({ step: 'executeByAddress GAS transfer at limit', txid: allowedTx.txid, systemFee: allowedTx.systemFee, networkFee: allowedTx.networkFee });
  summary.allowedExecution = {
    vmState: String(allowedTx.appLog.executions?.[0]?.vmstate || allowedTx.appLog.executions?.[0]?.vmState || 'UNKNOWN').toUpperCase(),
    stack: allowedTx.appLog.executions?.[0]?.stack || [],
  };
  check('allowed transfer execution returns true', allowedTx.appLog.executions?.[0]?.stack?.[0]?.type === 'Boolean' && allowedTx.appLog.executions?.[0]?.stack?.[0]?.value === true, JSON.stringify(allowedTx.appLog.executions?.[0]?.stack || []));

  const balanceOwnerAfter = await getAssetBalance(owner.address, GAS_TOKEN_HASH);
  const balanceAccountAfter = await getAssetBalance(accountInfo.address, GAS_TOKEN_HASH);
  const balanceRecipientAfter = await getAssetBalance(recipient.address, GAS_TOKEN_HASH);

  check('recipient balance increases by allowed amount', balanceRecipientAfter - balanceRecipientBefore === allowedAmount, `${balanceRecipientAfter - balanceRecipientBefore}`);
  check('account balance decreases by allowed amount', balanceAccountFunded - balanceAccountAfter === allowedAmount, `${balanceAccountFunded - balanceAccountAfter}`);
  check('owner balance decreased after funding and fees', balanceOwnerAfter < balanceOwnerBefore, `${balanceOwnerAfter}`);

  summary.balances = {
    ownerBefore: balanceOwnerBefore.toString(),
    ownerAfter: balanceOwnerAfter.toString(),
    accountBefore: balanceAccountBefore.toString(),
    accountFunded: balanceAccountFunded.toString(),
    accountAfterBlocked: balanceAccountAfterBlocked.toString(),
    accountAfter: balanceAccountAfter.toString(),
    recipientBefore: balanceRecipientBefore.toString(),
    recipientAfterBlocked: balanceRecipientAfterBlocked.toString(),
    recipientAfter: balanceRecipientAfter.toString(),
  };
  summary.result = 'PASS';
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('[aa_testnet_max_transfer_validate] FAILED');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
