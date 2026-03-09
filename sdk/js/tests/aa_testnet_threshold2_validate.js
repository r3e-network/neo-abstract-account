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
const { bindMetaSearchHelpers } = require('./metaSearch');

const rpcUrl = 'https://testnet1.neo.coz.io:443';
const rpcClient = new rpc.RPCClient(rpcUrl);
const { getNetworkMagic, invokeRead, simulate } = bindRpcHelpers({ rpcClient, rpc, sc, u });
const { cpHash160, cpByteArray, cpByteArrayRaw, cpArray } = bindParamHelpers({ sc, u, sanitizeHex });
const { randomAccountIdHex, deriveAaAddressFromId } = bindAccountHelpers({ crypto, sc, u, wallet, sanitizeHex, cpByteArray });
const { decodeByteStringToHex, decodeInteger } = bindStackHelpers({ sanitizeHex, u });
const { sendInvocation } = bindInvocationHelpers({ rpcClient, txModule: tx, sc, u, sendTransaction, waitForTx, assertVmStateHalt, waitForConfirmation: true, assertHalt: true });
const { computeArgsHash, buildTypedData, buildArgsHashCandidates, buildPubKeyCandidates, buildExecuteMetaTxArgs, signTypedDataNoRecovery } = bindMetaTxHelpers({ buildMetaTransactionTypedData, invokeRead, cpArray, cpHash160, cpByteArray, cpByteArrayRaw, decodeByteStringToHex, sanitizeHex, reverseHex: u.reverseHex, sc });
const { buildMetaExecutionVariants } = bindMetaSearchHelpers({ invokeRead, cpHash160, cpByteArray, sanitizeHex, decodeInteger, decodeByteStringToHex, buildPubKeyCandidates, buildArgsHashCandidates, buildTypedData, computeArgsHash, signTypedDataNoRecovery, buildExecuteMetaTxArgs });

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
  targetContract = aaHash,
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
    targetContract,
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

async function findMetaSimulationVariant({
  ownerScriptHash,
  aaHash,
  useAddress,
  accountIdHex,
  accountAddressHash,
  signerWallet,
  magic,
  method,
  methodArgs,
  methodArgsBuilder,
  targetContract = aaHash,
  expectedState,
  expectedExceptionSubstring,
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
    deadlineSeconds: 3600,
    targetContract,
  });

  const operation = useAddress ? 'executeMetaTxByAddress' : 'executeMetaTx';
  const signerScope = [{ account: ownerScriptHash, scopes: tx.WitnessScope.CalledByEntry }];
  let lastResult = null;

  for (const variant of variants) {
    const result = await simulate(aaHash, operation, variant.args, signerScope);
    lastResult = { result, variant };
    if (result.state !== expectedState) {
      continue;
    }
    if (expectedExceptionSubstring && !String(result.exception || '').includes(expectedExceptionSubstring)) {
      continue;
    }
    return {
      result,
      variant,
    };
  }

  const attempted = attemptedArgsHashes.join(',');
  const lastSummary = lastResult
    ? `${lastResult.result.state}: ${lastResult.result.exception || 'no exception'}`
    : 'no variants tried';
  throw new Error(`Unable to find ${expectedState} ${operation} variant (argsHash attempts: ${attempted}; last=${lastSummary})`);
}

async function main() {
  const repoRoot = path.resolve(__dirname, '../../..');
  const envValues = parseEnvFile(path.join(repoRoot, '.env'));
  const aaHashRaw = process.env.AA_HASH_TESTNET || envValues.AA_HASH_TESTNET || envValues.VITE_AA_HASH_TESTNET || '';
  const aaHash = sanitizeHex(aaHashRaw);
  if (!/^[0-9a-f]{40}$/.test(aaHash)) {
    throw new Error(`Invalid testnet AA hash: ${aaHashRaw}`);
  }

  const wif = process.env.TEST_WIF;
  if (!wif) {
    throw new Error('TEST_WIF required');
  }

  const owner = new wallet.Account(wif);
  const ownerScriptHash = sanitizeHex(owner.scriptHash);
  const magic = await getNetworkMagic();
  const evmSigner = ethers.Wallet.createRandom();
  const evmSignerHex = sanitizeHex(evmSigner.address);

  const summary = {
    rpcUrl,
    aaHash: `0x${aaHash}`,
    ownerAddress: owner.address,
    ownerScriptHash: `0x${ownerScriptHash}`,
    account: null,
    txs: [],
    checks: [],
    simulations: [],
  };

  const check = (name, condition, details = null) => {
    summary.checks.push({ name, pass: !!condition, details });
    if (!condition) {
      throw new Error(`Check failed: ${name}${details ? ` :: ${details}` : ''}`);
    }
  };

  const ownerSigner = [{ account: ownerScriptHash, scopes: tx.WitnessScope.CalledByEntry }];
  const accountIdHex = randomAccountIdHex(16);
  const accountInfo = deriveAaAddressFromId(aaHash, accountIdHex);
  summary.account = {
    accountIdHex,
    accountAddress: accountInfo.address,
    accountAddressScriptHash: `0x${accountInfo.addressScriptHash}`,
    evmSignerAddress: evmSigner.address,
  };

  summary.txs.push({
    step: 'createAccountWithAddress(threshold2)',
    ...(await sendInvocation({
      account: owner,
      magic,
      aaHash,
      operation: 'createAccountWithAddress',
      args: [
        cpByteArrayRaw(accountIdHex),
        cpHash160(accountInfo.addressScriptHash),
        cpArray([cpHash160(ownerScriptHash), cpHash160(evmSignerHex)]),
        sc.ContractParam.integer(1),
        cpArray([]),
        sc.ContractParam.integer(0),
      ],
    })),
  });

  const initialThreshold = await invokeRead(aaHash, 'getAdminThresholdByAddress', [cpHash160(accountInfo.addressScriptHash)]);
  const initialAdmins = await invokeRead(aaHash, 'getAdminsByAddress', [cpHash160(accountInfo.addressScriptHash)]);
  check('threshold-2 account starts with admin threshold 1', String(initialThreshold.stack?.[0]?.value || '') === '1');
  check('threshold-2 account starts with two admins', (initialAdmins.stack?.[0]?.value || []).length === 2);

  summary.txs.push({
    step: 'setAdminsByAddress(threshold2, owner+evm, 2)',
    ...(await sendInvocation({
      account: owner,
      magic,
      aaHash,
      operation: 'setAdminsByAddress',
      args: [
        cpHash160(accountInfo.addressScriptHash),
        cpArray([cpHash160(ownerScriptHash), cpHash160(evmSignerHex)]),
        sc.ContractParam.integer(2),
      ],
    })),
  });

  const raisedThreshold = await invokeRead(aaHash, 'getAdminThresholdByAddress', [cpHash160(accountInfo.addressScriptHash)]);
  check('threshold-2 account raises admin threshold to 2', String(raisedThreshold.stack?.[0]?.value || '') === '2');

  const ownerOnlyExecute = await simulate(
    aaHash,
    'executeByAddress',
    [
      cpHash160(accountInfo.addressScriptHash),
      cpHash160(aaHash),
      sc.ContractParam.string('getNonce'),
      cpArray([cpHash160(ownerScriptHash)]),
    ],
    ownerSigner
  );
  summary.simulations.push({
    name: 'owner-only executeByAddress after threshold raise',
    state: ownerOnlyExecute.state,
    exception: ownerOnlyExecute.exception || null,
  });
  check('owner-only executeByAddress faults after threshold 2', ownerOnlyExecute.state === 'FAULT', ownerOnlyExecute.exception || 'expected FAULT');
  check('owner-only executeByAddress is unauthorized after threshold 2', String(ownerOnlyExecute.exception || '').includes('Unauthorized'), ownerOnlyExecute.exception || '');

  const initialNonceRes = await invokeRead(aaHash, 'getNonceForAddress', [cpHash160(accountInfo.addressScriptHash), cpHash160(evmSignerHex)]);
  check('threshold-2 EVM nonce starts at 0', decodeInteger(initialNonceRes.stack?.[0]) === 0, String(initialNonceRes.stack?.[0]?.value || '0'));

  const mixedSimulation = await findMetaSimulationVariant({
    ownerScriptHash,
    aaHash,
    useAddress: true,
    accountIdHex,
    accountAddressHash: accountInfo.addressScriptHash,
    signerWallet: evmSigner,
    magic,
    targetContract: aaHash,
    method: 'getNonce',
    methodArgs: [cpHash160(ownerScriptHash)],
    expectedState: 'HALT',
  });
  summary.simulations.push({
    name: 'mixed executeMetaTxByAddress getNonce before live send',
    state: mixedSimulation.result.state,
    exception: mixedSimulation.result.exception || null,
    argsHashHex: mixedSimulation.variant.argsHashHex,
    pubKeyHexLength: mixedSimulation.variant.pubKeyHex.length,
  });
  check('mixed executeMetaTxByAddress getNonce HALTs at threshold 2', mixedSimulation.result.state === 'HALT');

  const mixedMetaTx = await executeMetaTx({
    account: owner,
    magic,
    aaHash,
    useAddress: true,
    accountIdHex,
    accountAddressHash: accountInfo.addressScriptHash,
    signerWallet: evmSigner,
    targetContract: aaHash,
    method: 'getNonce',
    methodArgs: [cpHash160(ownerScriptHash)],
  });
  summary.txs.push({ step: 'mixed metaTx getNonce at threshold 2', ...mixedMetaTx });

  const nonceAfterMeta = await invokeRead(aaHash, 'getNonceForAddress', [cpHash160(accountInfo.addressScriptHash), cpHash160(evmSignerHex)]);
  check('threshold-2 EVM nonce after live mixed meta tx == 1', decodeInteger(nonceAfterMeta.stack?.[0]) === 1, String(nonceAfterMeta.stack?.[0]?.value || '0'));

  summary.result = 'PASS';
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('[aa_testnet_threshold2_validate] FAILED');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
