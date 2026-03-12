const path = require('path');
const crypto = require('crypto');
const { rpc, tx, wallet, sc, u } = require('@cityofzion/neon-js');
const { sanitizeHex } = require('../src/metaTx');
const { parseEnvFile } = require('./env');
const { assertVmStateHalt, waitForTx, sendTransaction } = require('./tx');
const { bindRpcHelpers } = require('./rpc');
const { bindParamHelpers } = require('./params');
const { bindAccountHelpers } = require('./account');
const { bindStackHelpers } = require('./stack');
const { bindInvocationHelpers } = require('./invoke');

const rpcUrl = 'https://testnet1.neo.coz.io:443';
const rpcClient = new rpc.RPCClient(rpcUrl);
const { getNetworkMagic, invokeRead, simulate } = bindRpcHelpers({ rpcClient, rpc, sc, u });
const { cpHash160, cpByteArray, cpByteArrayRaw, cpArray } = bindParamHelpers({ sc, u, sanitizeHex });
const { randomAccountIdHex, deriveAaAddressFromId } = bindAccountHelpers({ crypto, sc, u, wallet, sanitizeHex, cpByteArray });
const { decodeInteger } = bindStackHelpers({ sanitizeHex, u });
const { sendInvocation } = bindInvocationHelpers({ rpcClient, txModule: tx, sc, u, sendTransaction, waitForTx, assertVmStateHalt, waitForConfirmation: true, assertHalt: true });

const DEFAULT_DOME_ORACLE_URL = 'https://api.github.com/repos/neo-project/neo';
const DEFAULT_DOME_ORACLE_FILTER = '$.has_issues';
const DEFAULT_DOME_TIMEOUT_MS = 15000;
const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_WAIT_TIMEOUT_MS = 240000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForState({ label, timeoutMs, pollIntervalMs, probe }) {
  const start = Date.now();
  let lastResult = null;

  while (Date.now() - start < timeoutMs) {
    lastResult = await probe();
    if (lastResult?.done) {
      return { ...lastResult, elapsedMs: Date.now() - start };
    }
    await sleep(pollIntervalMs);
  }

  throw new Error(`${label} did not complete within ${timeoutMs}ms${lastResult ? ` :: ${JSON.stringify(lastResult)}` : ''}`);
}

async function main() {
  const repoRoot = path.resolve(__dirname, '../../..');
  const envValues = parseEnvFile(path.join(repoRoot, '.env'));
  const aaHashRaw = process.env.AA_HASH_TESTNET || envValues.AA_HASH_TESTNET || envValues.VITE_AA_HASH_TESTNET || '';
  const aaHash = sanitizeHex(aaHashRaw);
  if (!/^[0-9a-f]{40}$/.test(aaHash)) throw new Error(`Invalid testnet AA hash: ${aaHashRaw}`);

  const wif = process.env.TEST_WIF;
  if (!wif) throw new Error('TEST_WIF required');

  const domeOracleUrl = process.env.DOME_ORACLE_URL || DEFAULT_DOME_ORACLE_URL;
  const domeOracleFilter = process.env.DOME_ORACLE_FILTER || DEFAULT_DOME_ORACLE_FILTER;
  const domeOracleConfig = domeOracleFilter ? `${domeOracleUrl}|${domeOracleFilter}` : domeOracleUrl;
  const domeTimeoutMs = Number(process.env.DOME_TIMEOUT_MS || DEFAULT_DOME_TIMEOUT_MS);
  const pollIntervalMs = Number(process.env.DOME_POLL_INTERVAL_MS || DEFAULT_POLL_INTERVAL_MS);
  const waitTimeoutMs = Number(process.env.DOME_WAIT_TIMEOUT_MS || DEFAULT_WAIT_TIMEOUT_MS);
  if (!Number.isFinite(domeTimeoutMs) || domeTimeoutMs <= 0) throw new Error(`Invalid DOME_TIMEOUT_MS: ${process.env.DOME_TIMEOUT_MS || ''}`);
  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs <= 0) throw new Error(`Invalid DOME_POLL_INTERVAL_MS: ${process.env.DOME_POLL_INTERVAL_MS || ''}`);
  if (!Number.isFinite(waitTimeoutMs) || waitTimeoutMs <= 0) throw new Error(`Invalid DOME_WAIT_TIMEOUT_MS: ${process.env.DOME_WAIT_TIMEOUT_MS || ''}`);

  const owner = new wallet.Account(wif);
  const ownerScriptHash = sanitizeHex(owner.scriptHash);
  const magic = await getNetworkMagic();
  const ownerSigner = [{ account: owner.scriptHash, scopes: tx.WitnessScope.CalledByEntry }];

  const summary = {
    rpcUrl,
    aaHash: `0x${aaHash}`,
    domeOracleUrl,
    domeOracleFilter,
    domeOracleConfig,
    domeTimeoutMs,
    ownerAddress: owner.address,
    ownerScriptHash: `0x${ownerScriptHash}`,
    account: null,
    txs: [],
    checks: [],
    simulations: [],
    waits: [],
  };

  const check = (name, condition, details = null) => {
    summary.checks.push({ name, pass: !!condition, details });
    if (!condition) throw new Error(`Check failed: ${name}${details ? ` :: ${details}` : ''}`);
  };

  const accountIdHex = randomAccountIdHex(16);
  const accountInfo = deriveAaAddressFromId(aaHash, accountIdHex);
  summary.account = {
    accountIdHex,
    accountAddress: accountInfo.address,
    accountAddressScriptHash: `0x${accountInfo.addressScriptHash}`,
  };

  const executeArgs = [
    cpHash160(accountInfo.addressScriptHash),
    cpHash160(aaHash),
    sc.ContractParam.string('getNonce'),
    cpArray([cpHash160(ownerScriptHash)]),
  ];

  summary.txs.push({
    step: 'createAccountWithAddress(dome-oracle)',
    ...(await sendInvocation({
      account: owner,
      magic,
      aaHash,
      operation: 'createAccountWithAddress',
      args: [
        cpByteArrayRaw(accountIdHex),
        cpHash160(accountInfo.addressScriptHash),
        cpArray([cpHash160(ownerScriptHash)]),
        sc.ContractParam.integer(1),
        cpArray([]),
        sc.ContractParam.integer(0),
      ],
    })),
  });

  summary.txs.push({
    step: 'setDomeAccountsByAddress(owner, threshold 1)',
    ...(await sendInvocation({
      account: owner,
      magic,
      aaHash,
      operation: 'setDomeAccountsByAddress',
      args: [
        cpHash160(accountInfo.addressScriptHash),
        cpArray([cpHash160(ownerScriptHash)]),
        sc.ContractParam.integer(1),
        sc.ContractParam.integer(domeTimeoutMs),
      ],
    })),
  });

  summary.txs.push({
    step: 'setDomeOracleByAddress(url)',
    ...(await sendInvocation({
      account: owner,
      magic,
      aaHash,
      operation: 'setDomeOracleByAddress',
      args: [cpHash160(accountInfo.addressScriptHash), sc.ContractParam.string(domeOracleConfig)],
    })),
  });

  summary.txs.push({
    step: 'setSignersByAddress(proxy-only)',
    ...(await sendInvocation({
      account: owner,
      magic,
      aaHash,
      operation: 'setSignersByAddress',
      args: [cpHash160(accountInfo.addressScriptHash), cpArray([cpHash160(accountInfo.addressScriptHash)]), sc.ContractParam.integer(1)],
    })),
  });

  const domeThreshold = await invokeRead(aaHash, 'getDomeThresholdByAddress', [cpHash160(accountInfo.addressScriptHash)]);
  const domeTimeout = await invokeRead(aaHash, 'getDomeTimeoutByAddress', [cpHash160(accountInfo.addressScriptHash)]);
  const oracleUnlockedInitial = await invokeRead(aaHash, 'isDomeOracleUnlocked', [cpByteArrayRaw(accountIdHex)]);
  check('dome threshold by address == 1', String(domeThreshold.stack?.[0]?.value || '') === '1');
  check('dome timeout by address matches requested value', decodeInteger(domeTimeout.stack?.[0]) === domeTimeoutMs, String(domeTimeout.stack?.[0]?.value || '0'));
  check('oracle is initially locked', oracleUnlockedInitial.stack?.[0]?.type === 'Boolean' && oracleUnlockedInitial.stack?.[0]?.value === false, JSON.stringify(oracleUnlockedInitial.stack || []));

  const beforeTimeout = await simulate(aaHash, 'executeByAddress', executeArgs, ownerSigner);
  summary.simulations.push({
    name: 'owner executeByAddress before dome timeout',
    state: beforeTimeout.state,
    exception: beforeTimeout.exception || null,
  });
  check('owner executeByAddress faults before dome timeout', beforeTimeout.state === 'FAULT', beforeTimeout.exception || 'expected FAULT');
  check('before-timeout failure mentions dome inactivity', String(beforeTimeout.exception || '').includes('Dome account not active yet'), beforeTimeout.exception || '');

  const waitForTimeout = await waitForState({
    label: 'dome timeout wait',
    timeoutMs: waitTimeoutMs,
    pollIntervalMs,
    probe: async () => {
      const result = await simulate(aaHash, 'executeByAddress', executeArgs, ownerSigner);
      return {
        done: result.state === 'FAULT' && String(result.exception || '').includes('Dome account not unlocked by oracle'),
        state: result.state,
        exception: result.exception || null,
      };
    },
  });
  summary.waits.push({
    name: 'wait for dome timeout to elapse',
    elapsedMs: waitForTimeout.elapsedMs,
    state: waitForTimeout.state,
    exception: waitForTimeout.exception,
  });
  check('after timeout executeByAddress is blocked by oracle lock', String(waitForTimeout.exception || '').includes('Dome account not unlocked by oracle'), waitForTimeout.exception || '');

  summary.txs.push({
    step: 'requestDomeActivationByAddress',
    ...(await sendInvocation({
      account: owner,
      magic,
      aaHash,
      operation: 'requestDomeActivationByAddress',
      args: [cpHash160(accountInfo.addressScriptHash)],
    })),
  });

  let waitForOracle;
  try {
    waitForOracle = await waitForState({
    label: 'oracle callback unlock',
    timeoutMs: waitTimeoutMs,
    pollIntervalMs,
    probe: async () => {
      const unlocked = await invokeRead(aaHash, 'isDomeOracleUnlocked', [cpByteArrayRaw(accountIdHex)]);
      const isUnlocked = unlocked.stack?.[0]?.type === 'Boolean' && unlocked.stack?.[0]?.value === true;
      return {
        done: isUnlocked,
        stack: unlocked.stack || [],
      };
    },
  });
    summary.waits.push({
      name: 'wait for oracle callback unlock',
      elapsedMs: waitForOracle.elapsedMs,
      stack: waitForOracle.stack,
    });
  } catch (error) {
    const responseCode = await invokeRead(aaHash, 'getLastDomeOracleResponseCodeByAddress', [cpHash160(accountInfo.addressScriptHash)]);
    const responseBody = await invokeRead(aaHash, 'getLastDomeOracleResponseByAddress', [cpHash160(accountInfo.addressScriptHash)]);
    const responseUrl = await invokeRead(aaHash, 'getLastDomeOracleResponseUrlByAddress', [cpHash160(accountInfo.addressScriptHash)]);
    const urlMatched = await invokeRead(aaHash, 'getLastDomeOracleUrlMatchedByAddress', [cpHash160(accountInfo.addressScriptHash)]);
    const truthAccepted = await invokeRead(aaHash, 'getLastDomeOracleTruthAcceptedByAddress', [cpHash160(accountInfo.addressScriptHash)]);
    const unlockApplied = await invokeRead(aaHash, 'getLastDomeOracleUnlockAppliedByAddress', [cpHash160(accountInfo.addressScriptHash)]);
    summary.oracleDiagnostics = {
      responseCode: String(responseCode.stack?.[0]?.value || '0'),
      responseBodyHex: Buffer.from(responseBody.stack?.[0]?.value || '', 'base64').toString('hex'),
      responseBodyUtf8: Buffer.from(responseBody.stack?.[0]?.value || '', 'base64').toString('utf8'),
      responseUrl: responseUrl.stack?.[0]?.value || '',
      urlMatched: urlMatched.stack?.[0]?.value === true,
      truthAccepted: truthAccepted.stack?.[0]?.value === true,
      unlockApplied: unlockApplied.stack?.[0]?.value === true,
    };
    throw error;
  }

  const afterUnlock = await simulate(aaHash, 'executeByAddress', executeArgs, ownerSigner);
  summary.simulations.push({
    name: 'owner executeByAddress after oracle unlock',
    state: afterUnlock.state,
    exception: afterUnlock.exception || null,
    stack: afterUnlock.stack || [],
  });
  check('owner executeByAddress HALTs after oracle unlock', afterUnlock.state === 'HALT', afterUnlock.exception || '');

  summary.txs.push({
    step: 'executeByAddress via dome after unlock',
    ...(await sendInvocation({
      account: owner,
      magic,
      aaHash,
      operation: 'executeByAddress',
      args: executeArgs,
    })),
  });

  summary.result = 'PASS';
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('[aa_testnet_dome_oracle_validate] FAILED');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
