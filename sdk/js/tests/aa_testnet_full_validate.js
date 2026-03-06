const { rpc, tx, wallet, sc, u } = require('@cityofzion/neon-js');
const { ethers } = require('ethers');
const { buildMetaTransactionTypedData, sanitizeHex } = require('../src/metaTx');
const path = require('path');
const crypto = require('crypto');
const { parseEnvFile } = require('./env');
const { assertVmStateHalt, waitForTx, sendTransaction } = require('./tx');
const { bindRpcHelpers } = require('./rpc');
const { bindParamHelpers } = require('./params');
const { bindAccountHelpers } = require('./account');
const { bindStackHelpers } = require('./stack');
const { bindInvocationHelpers } = require('./invoke');
const { bindMetaTxHelpers } = require('./meta');
const { bindWhitelistArgBuilders } = require('./whitelistArgs');
const { bindMetaSearchHelpers } = require('./metaSearch');

const rpcUrl = 'https://testnet1.neo.coz.io:443';
const rpcClient = new rpc.RPCClient(rpcUrl);
const { getNetworkMagic, invokeRead, simulate } = bindRpcHelpers({ rpcClient, rpc, sc, u });
const { cpHash160, cpByteArray, cpByteArrayRaw, cpArray } = bindParamHelpers({ sc, u, sanitizeHex });
const { randomAccountIdHex, deriveAaAddressFromId } = bindAccountHelpers({ crypto, sc, u, wallet, sanitizeHex, cpByteArray });
const { decodeByteStringToHex, decodeInteger, normalizeReadByteString } = bindStackHelpers({ sanitizeHex, u });
const { sendInvocation } = bindInvocationHelpers({ rpcClient, txModule: tx, sc, u, sendTransaction, waitForTx, assertVmStateHalt, waitForConfirmation: true, assertHalt: true });
const { computeArgsHash, buildTypedData, buildArgsHashCandidates, buildPubKeyCandidates, buildExecuteMetaTxArgs, signTypedDataNoRecovery } = bindMetaTxHelpers({ buildMetaTransactionTypedData, invokeRead, cpArray, cpHash160, cpByteArray, cpByteArrayRaw, decodeByteStringToHex, sanitizeHex, reverseHex: u.reverseHex, sc });
const { buildSetWhitelistByAddressArgs, buildSetWhitelistModeByAddressArgs, buildSetWhitelistModeByAccountIdArgs } = bindWhitelistArgBuilders({ cpHash160, cpByteArray, cpByteArrayRaw, cpArray, sc });
const { buildMetaExecutionVariants } = bindMetaSearchHelpers({ invokeRead, cpHash160, cpByteArray, sanitizeHex, decodeInteger, decodeByteStringToHex, buildPubKeyCandidates, buildArgsHashCandidates, buildTypedData, computeArgsHash, signTypedDataNoRecovery, buildExecuteMetaTxArgs });
const GAS_TOKEN_HASH = 'd2a4cff31913016155e38e474a2c06d08be276cf';

async function executeMetaTx({
  account,
  magic,
  aaHash,
  useAddress,
  accountIdHex,
  accountAddressHash,
  signerWallet,
  method,
  methodArgs,
  methodArgsBuilder,
  methodArgsAlternativeBuilders = [],
}) {
  const { attemptedArgsHashes, variants } = await buildMetaExecutionVariants({
    aaHash,
    useAddress,
    accountIdHex,
    accountAddressHash,
    signerWallet,
    magic,
    method,
    methodArgs,
    methodArgsBuilder,
    methodArgsAlternativeBuilders,
    deadlineSeconds: 7200,
  });

  const operation = useAddress ? 'executeMetaTxByAddress' : 'executeMetaTx';
  let txResult = null;
  let lastError = null;
  let selectedVariant = null;

  for (const variant of variants) {
    try {
      txResult = await sendInvocation({
        account,
        magic,
        aaHash,
        operation,
        args: variant.args,
      });
      selectedVariant = variant;
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!txResult) {
    const attempted = attemptedArgsHashes.join(',');
    const baseMessage = lastError && lastError.message ? lastError.message : `Unable to execute ${operation}`;
    throw new Error(`${baseMessage} (argsHash attempts: ${attempted})`);
  }

  return {
    ...txResult,
    pubKeyHex: selectedVariant.pubKeyHex,
    argsHashHex: selectedVariant.argsHashHex,
    argsVariant: selectedVariant.argsVariant,
    nonceBefore: selectedVariant.nonce,
    signerAddressHex: selectedVariant.signerAddressHex,
  };
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

  const owner = new wallet.Account(wif);
  const ownerScriptHash = sanitizeHex(owner.scriptHash);
  const magic = await getNetworkMagic();

  const summary = {
    rpcUrl,
    aaHash: `0x${aaHash}`,
    ownerAddress: owner.address,
    ownerScriptHash: `0x${ownerScriptHash}`,
    txs: [],
    checks: [],
  };

  const check = (name, condition, details = null) => {
    summary.checks.push({ name, pass: !!condition, details });
    if (!condition) {
      throw new Error(`Check failed: ${name}${details ? ` :: ${details}` : ''}`);
    }
  };

  const ownerSigner = [{ account: ownerScriptHash, scopes: tx.WitnessScope.CalledByEntry }];

  // Account A: native admin+manager path
  const accountIdA = randomAccountIdHex(16);
  const accountA = deriveAaAddressFromId(aaHash, accountIdA);
  summary.accountA = { accountIdHex: accountIdA, accountAddress: accountA.address, accountAddressScriptHash: `0x${accountA.addressScriptHash}` };

  summary.txs.push({
    step: 'createAccountWithAddress(A)',
    ...(await sendInvocation({
      account: owner,
      magic,
      aaHash,
      operation: 'createAccountWithAddress',
      args: [
        cpByteArray(accountIdA),
        cpHash160(accountA.addressScriptHash),
        cpArray([cpHash160(ownerScriptHash)]),
        sc.ContractParam.integer(1),
        cpArray([cpHash160(ownerScriptHash)]),
        sc.ContractParam.integer(1),
      ],
    })),
  });

  const adminsAById = await invokeRead(aaHash, 'getAdmins', [cpByteArray(accountIdA)]);
  const adminsAByAddr = await invokeRead(aaHash, 'getAdminsByAddress', [cpHash160(accountA.addressScriptHash)]);
  const adminThresholdAById = await invokeRead(aaHash, 'getAdminThreshold', [cpByteArray(accountIdA)]);
  const adminThresholdAByAddr = await invokeRead(aaHash, 'getAdminThresholdByAddress', [cpHash160(accountA.addressScriptHash)]);
  const managersAById = await invokeRead(aaHash, 'getManagers', [cpByteArray(accountIdA)]);
  const managersAByAddr = await invokeRead(aaHash, 'getManagersByAddress', [cpHash160(accountA.addressScriptHash)]);
  const managerThresholdAById = await invokeRead(aaHash, 'getManagerThreshold', [cpByteArray(accountIdA)]);
  const managerThresholdAByAddr = await invokeRead(aaHash, 'getManagerThresholdByAddress', [cpHash160(accountA.addressScriptHash)]);
  const idByAddressA = await invokeRead(aaHash, 'getAccountIdByAddress', [cpHash160(accountA.addressScriptHash)]);
  const addressByIdA = await invokeRead(aaHash, 'getAccountAddress', [cpByteArray(accountIdA)]);

  check('A admins by id count == 1', (adminsAById.stack?.[0]?.value || []).length === 1);
  check('A admins by address count == 1', (adminsAByAddr.stack?.[0]?.value || []).length === 1);
  check('A admin threshold by id == 1', String(adminThresholdAById.stack?.[0]?.value) === '1');
  check('A admin threshold by address == 1', String(adminThresholdAByAddr.stack?.[0]?.value) === '1');
  check('A managers by id count == 1', (managersAById.stack?.[0]?.value || []).length === 1);
  check('A managers by address count == 1', (managersAByAddr.stack?.[0]?.value || []).length === 1);
  check('A manager threshold by id == 1', String(managerThresholdAById.stack?.[0]?.value) === '1');
  check('A manager threshold by address == 1', String(managerThresholdAByAddr.stack?.[0]?.value) === '1');

  const idAReadRaw = decodeByteStringToHex(idByAddressA.stack?.[0]);
  const idAReadNormalized = normalizeReadByteString(idAReadRaw);
  const addressAReadRaw = decodeByteStringToHex(addressByIdA.stack?.[0]);
  const addressAReadNormalized = normalizeReadByteString(addressAReadRaw);

  check('A getAccountIdByAddress matches accountId', idAReadNormalized === accountIdA, `raw=${idAReadRaw}`);
  check('A getAccountAddress matches address hash', addressAReadNormalized === accountA.addressScriptHash, `raw=${addressAReadRaw}`);

  const nonceOwnerGlobal = await invokeRead(aaHash, 'getNonce', [cpHash160(ownerScriptHash)]);
  const nonceAByAccount = await invokeRead(aaHash, 'getNonceForAccount', [cpByteArray(accountIdA), cpHash160(ownerScriptHash)]);
  const nonceAByAddress = await invokeRead(aaHash, 'getNonceForAddress', [cpHash160(accountA.addressScriptHash), cpHash160(ownerScriptHash)]);
  check('A nonce for account initially zero', decodeInteger(nonceAByAccount.stack?.[0]) === 0);
  check('A nonce for address initially zero', decodeInteger(nonceAByAddress.stack?.[0]) === 0);
  summary.nonceOwnerGlobal = String(nonceOwnerGlobal.stack?.[0]?.value || '0');

  const argsHashSample = await computeArgsHash(aaHash, [sc.ContractParam.string('aa-validate')]);
  check('computeArgsHash returns 32-byte hash', /^[0-9a-f]{64}$/.test(argsHashSample), argsHashSample);

  summary.txs.push({ step: 'setAdminsByAddress(A)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setAdminsByAddress',
    args: [cpHash160(accountA.addressScriptHash), cpArray([cpHash160(ownerScriptHash)]), sc.ContractParam.integer(1)],
  }))});

  summary.txs.push({ step: 'setManagers(A)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setManagers',
    args: [cpByteArray(accountIdA), cpArray([cpHash160(ownerScriptHash)]), sc.ContractParam.integer(1)],
  }))});

  summary.txs.push({ step: 'setManagersByAddress(A)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setManagersByAddress',
    args: [cpHash160(accountA.addressScriptHash), cpArray([cpHash160(ownerScriptHash)]), sc.ContractParam.integer(1)],
  }))});

  summary.txs.push({ step: 'setWhitelistMode(A,true)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setWhitelistMode',
    args: buildSetWhitelistModeByAccountIdArgs(accountIdA, true),
  }))});

  summary.txs.push({ step: 'setWhitelist(A,aaHash,true)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setWhitelist',
    args: [cpByteArray(accountIdA), cpHash160(aaHash), sc.ContractParam.boolean(true)],
  }))});

  const simExecuteA = await simulate(aaHash, 'execute', [cpByteArray(accountIdA), cpHash160(aaHash), sc.ContractParam.string('getNonce'), cpArray([cpHash160(ownerScriptHash)])], ownerSigner);
  const simExecuteByAddressA = await simulate(aaHash, 'executeByAddress', [cpHash160(accountA.addressScriptHash), cpHash160(aaHash), sc.ContractParam.string('getNonce'), cpArray([cpHash160(ownerScriptHash)])], ownerSigner);
  check('execute(accountId) HALT for A', simExecuteA.state === 'HALT', simExecuteA.exception || '');
  check('executeByAddress HALT for A', simExecuteByAddressA.state === 'HALT', simExecuteByAddressA.exception || '');

  summary.txs.push({ step: 'setBlacklistByAddress(A,aaHash,true)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setBlacklistByAddress',
    args: [cpHash160(accountA.addressScriptHash), cpHash160(aaHash), sc.ContractParam.boolean(true)],
  }))});

  const simBlockedA = await simulate(aaHash, 'executeByAddress', [cpHash160(accountA.addressScriptHash), cpHash160(aaHash), sc.ContractParam.string('getNonce'), cpArray([cpHash160(ownerScriptHash)])], ownerSigner);
  check('blacklist blocks executeByAddress for A', simBlockedA.state === 'FAULT' && String(simBlockedA.exception || '').includes('blacklisted'), simBlockedA.exception || '');

  summary.txs.push({ step: 'setBlacklist(A,aaHash,false)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setBlacklist',
    args: [cpByteArray(accountIdA), cpHash160(aaHash), sc.ContractParam.boolean(false)],
  }))});

  const simUnblockedA = await simulate(aaHash, 'executeByAddress', [cpHash160(accountA.addressScriptHash), cpHash160(aaHash), sc.ContractParam.string('getNonce'), cpArray([cpHash160(ownerScriptHash)])], ownerSigner);
  check('unblacklist restores executeByAddress for A', simUnblockedA.state === 'HALT', simUnblockedA.exception || '');

  summary.txs.push({ step: 'setMaxTransferByAddress(A,GAS,1)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setMaxTransferByAddress',
    args: [cpHash160(accountA.addressScriptHash), cpHash160(GAS_TOKEN_HASH), sc.ContractParam.integer(1)],
  }))});

  summary.txs.push({ step: 'setWhitelistModeByAddress(A,false)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setWhitelistModeByAddress',
    args: buildSetWhitelistModeByAddressArgs(accountA.addressScriptHash, false),
  }))});

  // Account B: create without address then bind
  const accountIdB = randomAccountIdHex(16);
  const accountB = deriveAaAddressFromId(aaHash, accountIdB);
  summary.accountB = { accountIdHex: accountIdB, accountAddress: accountB.address, accountAddressScriptHash: `0x${accountB.addressScriptHash}` };

  const rogueAdminHash = randomAccountIdHex(20);
  const simUnauthorizedCreateB = await simulate(aaHash, 'createAccount', [
    cpByteArray(accountIdB),
    cpArray([cpHash160(rogueAdminHash)]),
    sc.ContractParam.integer(1),
    cpArray(),
    sc.ContractParam.integer(0),
  ], ownerSigner);
  check(
    'unauthorized createAccount simulation fails under bootstrap auth',
    simUnauthorizedCreateB.state === 'FAULT' && String(simUnauthorizedCreateB.exception || '').includes('Unauthorized account initialization'),
    simUnauthorizedCreateB.exception || ''
  );

  summary.txs.push({ step: 'createAccount(B)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'createAccount',
    args: [
      cpByteArray(accountIdB),
      cpArray([cpHash160(ownerScriptHash)]),
      sc.ContractParam.integer(1),
      cpArray(),
      sc.ContractParam.integer(0),
    ],
  }))});

  const idBeforeBindB = await invokeRead(aaHash, 'getAccountIdByAddress', [cpHash160(accountB.addressScriptHash)]);
  const idBeforeBindHexB = decodeByteStringToHex(idBeforeBindB.stack?.[0]);
  check('B accountId not bound before bind', !idBeforeBindHexB, idBeforeBindHexB || 'null');

  summary.txs.push({ step: 'bindAccountAddress(B)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'bindAccountAddress',
    args: [cpByteArray(accountIdB), cpHash160(accountB.addressScriptHash)],
  }))});

  const idAfterBindB = await invokeRead(aaHash, 'getAccountIdByAddress', [cpHash160(accountB.addressScriptHash)]);
  const addrAfterBindB = await invokeRead(aaHash, 'getAccountAddress', [cpByteArray(accountIdB)]);
  check('B getAccountIdByAddress matches', normalizeReadByteString(decodeByteStringToHex(idAfterBindB.stack?.[0])) === accountIdB);
  check('B getAccountAddress matches', normalizeReadByteString(decodeByteStringToHex(addrAfterBindB.stack?.[0])) === accountB.addressScriptHash);

  // Account C: meta-tx validations (address and accountId paths)
  const ethSigner = ethers.Wallet.createRandom();
  const ethSignerHex = sanitizeHex(ethSigner.address);
  const accountIdC = randomAccountIdHex(16);
  const accountC = deriveAaAddressFromId(aaHash, accountIdC);
  summary.accountC = {
    accountIdHex: accountIdC,
    accountAddress: accountC.address,
    accountAddressScriptHash: `0x${accountC.addressScriptHash}`,
    ethSignerAddress: ethSigner.address,
  };

  summary.txs.push({ step: 'createAccountWithAddress(C owner+eth admin)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'createAccountWithAddress',
    args: [
      cpByteArray(accountIdC),
      cpHash160(accountC.addressScriptHash),
      cpArray([cpHash160(ownerScriptHash), cpHash160(ethSignerHex)]),
      sc.ContractParam.integer(1),
      cpArray(),
      sc.ContractParam.integer(0),
    ],
  }))});

  const meta1 = await executeMetaTx({
    account: owner,
    magic,
    aaHash,
    useAddress: true,
    accountIdHex: accountIdC,
    accountAddressHash: accountC.addressScriptHash,
    signerWallet: ethSigner,
    method: 'setWhitelistByAddress',
    methodArgsBuilder: () => buildSetWhitelistByAddressArgs(accountC.addressScriptHash, aaHash, true),
  });
  summary.txs.push({ step: 'metaTxByAddress setWhitelistByAddress(C,aaHash,true)', ...meta1 });

  const nonceAfterMeta1 = await invokeRead(aaHash, 'getNonceForAddress', [cpHash160(accountC.addressScriptHash), cpHash160(ethSignerHex)]);
  check('C nonce after meta1 == 1', decodeInteger(nonceAfterMeta1.stack?.[0]) === 1);

  const meta2 = await executeMetaTx({
    account: owner,
    magic,
    aaHash,
    useAddress: true,
    accountIdHex: accountIdC,
    accountAddressHash: accountC.addressScriptHash,
    signerWallet: ethSigner,
    method: 'setWhitelistModeByAddress',
    methodArgsBuilder: () => buildSetWhitelistModeByAddressArgs(accountC.addressScriptHash, true),
  });
  summary.txs.push({ step: 'metaTxByAddress setWhitelistModeByAddress(C,true)', ...meta2 });

  const nonceAfterMeta2 = await invokeRead(aaHash, 'getNonceForAddress', [cpHash160(accountC.addressScriptHash), cpHash160(ethSignerHex)]);
  check('C nonce after meta2 == 2', decodeInteger(nonceAfterMeta2.stack?.[0]) === 2);

  const simExecCNonWhitelisted = await simulate(
    aaHash,
    'executeByAddress',
    [
      cpHash160(accountC.addressScriptHash),
      cpHash160(GAS_TOKEN_HASH),
      sc.ContractParam.string('balanceOf'),
      cpArray([cpHash160(ownerScriptHash)]),
    ],
    ownerSigner
  );
  check(
    'C executeByAddress FAULT for non-whitelisted GAS target while whitelist mode on',
    simExecCNonWhitelisted.state === 'FAULT' && String(simExecCNonWhitelisted.exception || '').includes('whitelist'),
    simExecCNonWhitelisted.exception || ''
  );

  const simExecCWhitelisted = await simulate(aaHash, 'executeByAddress', [cpHash160(accountC.addressScriptHash), cpHash160(aaHash), sc.ContractParam.string('getNonce'), cpArray([cpHash160(ownerScriptHash)])], ownerSigner);
  check('C executeByAddress HALT while whitelisted + whitelist mode on', simExecCWhitelisted.state === 'HALT', simExecCWhitelisted.exception || '');

  summary.txs.push({ step: 'setWhitelistByAddress(C,aaHash,false) native', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setWhitelistByAddress',
    args: buildSetWhitelistByAddressArgs(accountC.addressScriptHash, aaHash, false),
  }))});

  const simExecCBlocked = await simulate(aaHash, 'executeByAddress', [cpHash160(accountC.addressScriptHash), cpHash160(aaHash), sc.ContractParam.string('getNonce'), cpArray([cpHash160(ownerScriptHash)])], ownerSigner);
  check('C executeByAddress FAULT when whitelist mode on and target removed', simExecCBlocked.state === 'FAULT' && String(simExecCBlocked.exception || '').includes('whitelist'), simExecCBlocked.exception || '');

  summary.txs.push({ step: 'setWhitelistByAddress(C,aaHash,true) native', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setWhitelistByAddress',
    args: buildSetWhitelistByAddressArgs(accountC.addressScriptHash, aaHash, true),
  }))});

  const meta3 = await executeMetaTx({
    account: owner,
    magic,
    aaHash,
    useAddress: false,
    accountIdHex: accountIdC,
    accountAddressHash: accountC.addressScriptHash,
    signerWallet: ethSigner,
    method: 'setWhitelistMode',
    methodArgsBuilder: () => buildSetWhitelistModeByAccountIdArgs(accountIdC, false),
  });
  summary.txs.push({ step: 'metaTx(accountId) setWhitelistMode(C,false)', ...meta3 });

  const nonceAfterMeta3ByAccount = await invokeRead(aaHash, 'getNonceForAccount', [cpByteArray(accountIdC), cpHash160(ethSignerHex)]);
  check('C nonce after meta3 (accountId path) == 3', decodeInteger(nonceAfterMeta3ByAccount.stack?.[0]) === 3);

  const simExecCAfterModeOff = await simulate(aaHash, 'executeByAddress', [cpHash160(accountC.addressScriptHash), cpHash160(aaHash), sc.ContractParam.string('getNonce'), cpArray([cpHash160(ownerScriptHash)])], ownerSigner);
  check('C executeByAddress HALT after whitelist mode off', simExecCAfterModeOff.state === 'HALT', simExecCAfterModeOff.exception || '');

  summary.result = 'PASS';
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error('[AA full validation] FAILED');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
