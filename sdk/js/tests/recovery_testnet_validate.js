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

async function main() {
  const wif = process.env.TEST_WIF;
  if (!wif) throw new Error('TEST_WIF is required');

  const recoveryHash = sanitizeHex(process.env.RECOVERY_HASH_TESTNET || '');
  if (!/^[0-9a-f]{40}$/.test(recoveryHash)) {
    throw new Error('RECOVERY_HASH_TESTNET not set. Deploy contract first.');
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

  console.log('[Recovery Verifier Test]');
  console.log('Owner:', account.address);
  console.log('Recovery Contract:', `0x${recoveryHash}`);

  const versionRes = await invokeRead(recoveryHash, 'version', []);
  const version = decodeString(versionRes.stack[0]);
  console.log('Version:', version);

  const accountId = new wallet.Account().scriptHash;
  console.log('Test Account ID:', accountId);

  const guardians = [new wallet.Account(), new wallet.Account(), new wallet.Account()];
  console.log('Guardians:', guardians.map((guardian) => guardian.address));

  const setupTx = await sendInvocation({
    account,
    magic,
    scriptHash: recoveryHash,
    operation: 'setupRecovery',
    args: [
      sc.ContractParam.hash160(accountId),
      sc.ContractParam.hash160(account.scriptHash),
      sc.ContractParam.array(...guardians.map((guardian) => sc.ContractParam.publicKey(guardian.publicKey))),
      sc.ContractParam.integer(2),
    ],
    waitForConfirmation: true,
    assertHalt: true,
    haltLabel: 'Argent recovery setupRecovery',
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

  console.log('\n[SUCCESS] Recovery verifier basic testnet validation passed');
}

main().catch((err) => {
  console.error('[Recovery Testnet Validate] FAILED');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
