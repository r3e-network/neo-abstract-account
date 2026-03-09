const { rpc, tx, wallet, sc, u } = require('@cityofzion/neon-js');
const { bindRpcHelpers } = require('./rpc');
const { bindInvocationHelpers } = require('./invoke');
const { sendTransaction, waitForTx, assertVmStateHalt } = require('./tx');

function sanitizeHex(value) {
  return String(value || '').replace(/^0x/i, '').toLowerCase();
}

function decodeByteStringToHex(item) {
  if (!item || item.type !== 'ByteString' || !item.value) return '';
  return Buffer.from(item.value, 'base64').toString('hex').toLowerCase();
}

function decodeString(item) {
  if (!item || item.type !== 'ByteString' || !item.value) return '';
  return Buffer.from(item.value, 'base64').toString('utf8');
}

function decodeInteger(item) {
  return Number(item?.value || 0);
}

async function runBasicRecoveryValidation({ hashEnvVar, label, buildSetupArgs }) {
  const wif = process.env.TEST_WIF;
  if (!wif) throw new Error('TEST_WIF is required');

  const recoveryHash = sanitizeHex(process.env[hashEnvVar] || '');
  if (!/^[0-9a-f]{40}$/.test(recoveryHash)) {
    throw new Error(`${hashEnvVar} not set. Deploy contract first.`);
  }

  const rpcUrl = 'https://testnet1.neo.coz.io:443';
  const rpcClient = new rpc.RPCClient(rpcUrl);
  const { getNetworkMagic, invokeRead } = bindRpcHelpers({ rpcClient, rpc, sc, u });
  const { sendInvocation } = bindInvocationHelpers({
    rpcClient,
    txModule: tx,
    sc,
    u,
    sendTransaction,
    waitForTx,
    assertVmStateHalt,
  });

  const account = new wallet.Account(wif);
  const magic = await getNetworkMagic('Unable to resolve testnet network magic');

  console.log(`[${label}]`);
  console.log('Owner:', account.address);
  console.log('Recovery Contract:', `0x${recoveryHash}`);

  const versionRes = await invokeRead(recoveryHash, 'version', []);
  const version = decodeString(versionRes.stack[0]);
  console.log('Version:', version);

  const accountId = new wallet.Account().scriptHash;
  console.log('Test Account ID:', accountId);

  const setupTx = await sendInvocation({
    account,
    magic,
    scriptHash: recoveryHash,
    operation: 'setupRecovery',
    args: buildSetupArgs({ account, accountId, wallet, sc, u }),
    waitForConfirmation: true,
    assertHalt: true,
    haltLabel: `${label} setupRecovery`,
  });

  console.log('Setup TX:', setupTx.txid);

  const ownerRes = await invokeRead(recoveryHash, 'getOwner', [sc.ContractParam.hash160(accountId)]);
  const ownerHex = decodeByteStringToHex(ownerRes.stack[0]);
  const expectedOwnerHex = sanitizeHex(u.reverseHex(account.scriptHash));
  console.log('Owner Hash:', ownerHex);
  console.log('Expected Owner Hash:', expectedOwnerHex);
  if (ownerHex !== expectedOwnerHex) {
    throw new Error(`Owner mismatch: expected ${expectedOwnerHex}, got ${ownerHex}`);
  }

  const nonceRes = await invokeRead(recoveryHash, 'getNonce', [sc.ContractParam.hash160(accountId)]);
  const nonce = decodeInteger(nonceRes.stack[0]);
  console.log('Nonce:', nonce);
  if (nonce !== 0) {
    throw new Error(`Expected nonce 0, got ${nonce}`);
  }

  console.log(`\n[SUCCESS] ${label} basic testnet validation passed`);
  return {
    version,
    txid: setupTx.txid,
    recoveryHash,
    nonce,
    ownerHex,
    expectedOwnerHex,
  };
}

module.exports = {
  runBasicRecoveryValidation,
  sanitizeHex,
  decodeByteStringToHex,
  decodeString,
  decodeInteger,
};
