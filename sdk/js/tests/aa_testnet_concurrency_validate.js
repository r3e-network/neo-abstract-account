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
      txResult = await sendInvocation({ account, magic, aaHash, operation, args: variant.args });
      selectedVariant = variant;
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!txResult) {
    throw new Error(`${lastError?.message || `Unable to execute ${operation}`} (argsHash attempts: ${attemptedArgsHashes.join(',')})`);
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

async function findMetaSimulationVariant({ ownerScriptHash, expectedState, expectedExceptionSubstring, ...params }) {
  const { attemptedArgsHashes, variants } = await buildMetaExecutionVariants({
    ...params,
    deadlineSeconds: 3600,
  });
  let lastResult = null;
  for (const variant of variants) {
    const result = await simulate(params.aaHash, params.useAddress ? 'executeMetaTxByAddress' : 'executeMetaTx', variant.args, [{ account: ownerScriptHash, scopes: tx.WitnessScope.CalledByEntry }]);
    lastResult = { result, variant };
    if (result.state !== expectedState) continue;
    if (expectedExceptionSubstring && !String(result.exception || '').includes(expectedExceptionSubstring)) continue;
    return { result, variant };
  }
  throw new Error(`Unable to find ${expectedState} meta simulation variant (argsHash attempts: ${attemptedArgsHashes.join(',')}; last=${lastResult ? `${lastResult.result.state}: ${lastResult.result.exception || 'no exception'}` : 'none'})`);
}

async function runParallel(label, count, fn) {
  const startedAt = Date.now();
  const results = await Promise.all(Array.from({ length: count }, async (_, index) => {
    const begin = Date.now();
    const result = await fn(index);
    return {
      index,
      elapsedMs: Date.now() - begin,
      ...result,
    };
  }));
  return {
    label,
    totalElapsedMs: Date.now() - startedAt,
    count,
    results,
  };
}

async function main() {
  const repoRoot = path.resolve(__dirname, '../../..');
  const envValues = parseEnvFile(path.join(repoRoot, '.env'));
  const aaHashRaw = process.env.AA_HASH_TESTNET || envValues.AA_HASH_TESTNET || envValues.VITE_AA_HASH_TESTNET || '';
  const aaHash = sanitizeHex(aaHashRaw);
  if (!/^[0-9a-f]{40}$/.test(aaHash)) throw new Error(`Invalid testnet AA hash: ${aaHashRaw}`);

  const wif = process.env.TEST_WIF;
  if (!wif) throw new Error('TEST_WIF required');

  const simulationCount = Number(process.env.SIMULATION_COUNT || process.env.CONCURRENCY_COUNT || 12);
  if (!Number.isFinite(simulationCount) || simulationCount <= 0) throw new Error(`Invalid SIMULATION_COUNT: ${process.env.SIMULATION_COUNT || process.env.CONCURRENCY_COUNT || ''}`);

  const owner = new wallet.Account(wif);
  const ownerScriptHash = sanitizeHex(owner.scriptHash);
  const magic = await getNetworkMagic();
  const ownerSigner = [{ account: owner.scriptHash, scopes: tx.WitnessScope.CalledByEntry }];
  const evmSigner = ethers.Wallet.createRandom();
  const evmSignerHex = sanitizeHex(evmSigner.address);
  const accountIdHex = randomAccountIdHex(16);
  const accountInfo = deriveAaAddressFromId(aaHash, accountIdHex);
  const executeArgs = [cpHash160(accountInfo.addressScriptHash), cpHash160(aaHash), sc.ContractParam.string('getNonce'), cpArray([cpHash160(ownerScriptHash)])];

  const summary = {
    rpcUrl,
    aaHash: `0x${aaHash}`,
    simulationCount,
    ownerAddress: owner.address,
    ownerScriptHash: `0x${ownerScriptHash}`,
    account: {
      accountIdHex,
      accountAddress: accountInfo.address,
      accountAddressScriptHash: `0x${accountInfo.addressScriptHash}`,
      evmSignerAddress: evmSigner.address,
    },
    txs: [],
    checks: [],
    batches: [],
  };

  const check = (name, condition, details = null) => {
    summary.checks.push({ name, pass: !!condition, details });
    if (!condition) throw new Error(`Check failed: ${name}${details ? ` :: ${details}` : ''}`);
  };

  summary.txs.push({
    step: 'createAccountWithAddress(concurrency)',
    ...(await sendInvocation({
      account: owner,
      magic,
      aaHash,
      operation: 'createAccountWithAddress',
      args: [
        cpByteArray(accountIdHex),
        cpHash160(accountInfo.addressScriptHash),
        cpArray([cpHash160(ownerScriptHash), cpHash160(evmSignerHex)]),
        sc.ContractParam.integer(1),
        cpArray([]),
        sc.ContractParam.integer(0),
      ],
    })),
  });

  const initialReads = await runParallel('initial executeByAddress simulations', simulationCount, async () => {
    const result = await simulate(aaHash, 'executeByAddress', executeArgs, ownerSigner);
    return { state: result.state, exception: result.exception || null, stack: result.stack || [] };
  });
  summary.batches.push(initialReads);
  check('all initial executeByAddress simulations HALT', initialReads.results.every((item) => item.state === 'HALT'), JSON.stringify(initialReads.results.map((item) => item.state)));
  check('all initial executeByAddress stacks agree', new Set(initialReads.results.map((item) => JSON.stringify(item.stack))).size === 1);

  const initialNonceReads = await runParallel('initial nonce reads', simulationCount, async () => {
    const result = await invokeRead(aaHash, 'getNonceForAddress', [cpHash160(accountInfo.addressScriptHash), cpHash160(evmSignerHex)]);
    return { nonce: decodeInteger(result.stack?.[0]) };
  });
  summary.batches.push(initialNonceReads);
  check('all initial nonce reads are zero', initialNonceReads.results.every((item) => item.nonce === 0), JSON.stringify(initialNonceReads.results.map((item) => item.nonce)));

  const metaSim = await findMetaSimulationVariant({
    ownerScriptHash: owner.scriptHash,
    expectedState: 'HALT',
    aaHash,
    useAddress: true,
    accountIdHex,
    accountAddressHash: accountInfo.addressScriptHash,
    signerWallet: evmSigner,
    magic,
    targetContract: aaHash,
    method: 'getNonce',
    methodArgs: [cpHash160(ownerScriptHash)],
  });
  summary.metaSimulationVariant = {
    argsHashHex: metaSim.variant.argsHashHex,
    pubKeyHexLength: metaSim.variant.pubKeyHex.length,
    nonce: metaSim.variant.nonce,
  };

  const metaSimReads = await runParallel('parallel meta simulations', simulationCount, async () => {
    const result = await simulate(aaHash, 'executeMetaTxByAddress', metaSim.variant.args, ownerSigner);
    return { state: result.state, exception: result.exception || null, stack: result.stack || [] };
  });
  summary.batches.push(metaSimReads);
  check('all meta simulations HALT before live sends', metaSimReads.results.every((item) => item.state === 'HALT'), JSON.stringify(metaSimReads.results.map((item) => item.state)));

  const metaTx1 = await executeMetaTx({
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
  summary.txs.push({ step: 'serialized meta tx #1', ...metaTx1 });

  const nonceAfterOne = await invokeRead(aaHash, 'getNonceForAddress', [cpHash160(accountInfo.addressScriptHash), cpHash160(evmSignerHex)]);
  check('nonce after first live meta tx == 1', decodeInteger(nonceAfterOne.stack?.[0]) === 1, String(nonceAfterOne.stack?.[0]?.value || '0'));

  const postWriteReads = await runParallel('post-write executeByAddress simulations', simulationCount, async () => {
    const result = await simulate(aaHash, 'executeByAddress', executeArgs, ownerSigner);
    return { state: result.state, exception: result.exception || null, stack: result.stack || [] };
  });
  summary.batches.push(postWriteReads);
  check('all post-write executeByAddress simulations HALT', postWriteReads.results.every((item) => item.state === 'HALT'), JSON.stringify(postWriteReads.results.map((item) => item.state)));

  const metaTx2 = await executeMetaTx({
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
  summary.txs.push({ step: 'serialized meta tx #2', ...metaTx2 });

  const finalNonceReads = await runParallel('final nonce reads', simulationCount, async () => {
    const result = await invokeRead(aaHash, 'getNonceForAddress', [cpHash160(accountInfo.addressScriptHash), cpHash160(evmSignerHex)]);
    return { nonce: decodeInteger(result.stack?.[0]) };
  });
  summary.batches.push(finalNonceReads);
  check('all final nonce reads are two', finalNonceReads.results.every((item) => item.nonce === 2), JSON.stringify(finalNonceReads.results.map((item) => item.nonce)));

  summary.result = 'PASS';
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('[aa_testnet_concurrency_validate] FAILED');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
