const { rpc, tx, wallet, sc, u } = require('@cityofzion/neon-js');
const path = require('path');
const crypto = require('crypto');
const { parseEnvFile } = require('./env');
const { extractVmState, waitForTx, sendTransaction } = require('./tx');
const { bindRpcHelpers } = require('./rpc');
const { bindAccountHelpers } = require('./account');
const { bindStackHelpers } = require('./stack');
const { sanitizeHex } = require('../src/metaTx');

const rpcUrl = 'https://testnet1.neo.coz.io:443';
const rpcClient = new rpc.RPCClient(rpcUrl);
const { invokeRead } = bindRpcHelpers({ rpcClient, sc, u });
const { randomAccountIdHex, deriveAaAddressFromId } = bindAccountHelpers({ crypto, sc, u, wallet, sanitizeHex });
const { decodeByteStringToHex, normalizeReadByteString } = bindStackHelpers({ sanitizeHex, u });

async function sendInvocation({ account, magic, aaHash, operation, args }) {
  const script = sc.createScript({ scriptHash: aaHash, operation, args });
  const signers = [{ account: account.scriptHash, scopes: tx.WitnessScope.CalledByEntry }];

  const currentHeight = await rpcClient.getBlockCount();
  const sim = await rpcClient.invokeScript(u.HexString.fromHex(script), signers);
  if (sim.state === 'FAULT') {
    throw new Error(`${operation} simulation fault: ${sim.exception}`);
  }

  const { txid, networkFee } = await sendTransaction({
    rpcClient,
    txModule: tx,
    account,
    magic,
    signers,
    validUntilBlock: currentHeight + 1000,
    script,
    systemFee: sim.gasconsumed || '1000000',
  });
  return {
    txid,
    systemFee: sim.gasconsumed,
    networkFee,
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

  const accountId = randomAccountIdHex(16);
  const accountInfo = deriveAaAddressFromId(aaHash, accountId);

  const idBeforeRes = await invokeRead(
    aaHash,
    'getAccountIdByAddress',
    [sc.ContractParam.hash160(accountInfo.addressScriptHash)]
  );
  const accountIdBefore = decodeByteStringToHex(idBeforeRes.stack[0]);

  const create = await sendInvocation({
    account,
    magic,
    aaHash,
    operation: 'createAccountWithAddress',
    args: [
      sc.ContractParam.byteArray(u.HexString.fromHex(accountId, false)),
      sc.ContractParam.hash160(accountInfo.addressScriptHash),
      sc.ContractParam.array(sc.ContractParam.hash160(sanitizeHex(account.scriptHash))),
      sc.ContractParam.integer(1),
      sc.ContractParam.array(),
      sc.ContractParam.integer(0),
    ],
  });

  const appLog = await waitForTx(rpcClient, create.txid, {
    timeoutMs: 120000,
    pollIntervalMs: 3000,
    errorMessage: `Timed out waiting for tx confirmation: ${create.txid}`,
  });
  const vmState = extractVmState(appLog);
  if (vmState !== 'HALT') {
    throw new Error(`createAccountWithAddress tx vmstate not HALT: ${vmState}`);
  }

  const getIdRes = await invokeRead(
    aaHash,
    'getAccountIdByAddress',
    [sc.ContractParam.hash160(accountInfo.addressScriptHash)]
  );
  const resolvedAccountId = decodeByteStringToHex(getIdRes.stack[0]);

  const getAddrRes = await invokeRead(
    aaHash,
    'getAccountAddress',
    [sc.ContractParam.byteArray(u.HexString.fromHex(accountId, false))]
  );
  const resolvedAccountAddressHash = decodeByteStringToHex(getAddrRes.stack[0]);
  const normalizedResolvedAccountId = normalizeReadByteString(resolvedAccountId);
  const normalizedResolvedAccountAddressHash = normalizeReadByteString(resolvedAccountAddressHash);

  const adminsAfterRes = await invokeRead(
    aaHash,
    'getAdminsByAddress',
    [sc.ContractParam.hash160(accountInfo.addressScriptHash)]
  );
  const adminThresholdRes = await invokeRead(
    aaHash,
    'getAdminThresholdByAddress',
    [sc.ContractParam.hash160(accountInfo.addressScriptHash)]
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
      accountAddress: accountInfo.address,
      accountAddressScriptHash: `0x${accountInfo.addressScriptHash}`,
    },
    tx: create,
    checks: {
      accountIdBeforeHex: accountIdBefore || null,
      adminsAfterCount: Array.isArray(adminsAfter) ? adminsAfter.length : null,
      adminThreshold,
      accountIdReadRawHex: resolvedAccountId || null,
      accountAddressReadRawHex: resolvedAccountAddressHash || null,
      accountIdBindingMatches: normalizedResolvedAccountId === accountId,
      accountAddressBindingMatches: normalizedResolvedAccountAddressHash === accountInfo.addressScriptHash,
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
