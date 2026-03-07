const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('crypto');
const { rpc, tx, wallet, sc, u } = require('@cityofzion/neon-js');
const { sanitizeHex } = require('../src/metaTx');
const { extractDeployedContractHash } = require('../src/deployLog');
const { parseEnvFile } = require('./env');
const { assertVmStateHalt, waitForTx, sendTransaction } = require('./tx');
const { bindRpcHelpers } = require('./rpc');
const { bindParamHelpers } = require('./params');
const { bindAccountHelpers } = require('./account');
const { bindInvocationHelpers } = require('./invoke');
const { buildDeployScript } = require('./deployHelpers');

const rpcUrl = 'https://testnet1.neo.coz.io:443';
const rpcClient = new rpc.RPCClient(rpcUrl);
const { getNetworkMagic, invokeRead, simulate } = bindRpcHelpers({ rpcClient, rpc, sc, u });
const { cpHash160, cpByteArray, cpArray } = bindParamHelpers({ sc, u, sanitizeHex });
const { randomAccountIdHex, deriveAaAddressFromId } = bindAccountHelpers({ crypto, sc, u, wallet, sanitizeHex, cpByteArray });
const { sendInvocation } = bindInvocationHelpers({ rpcClient, txModule: tx, sc, u, sendTransaction, waitForTx, assertVmStateHalt, waitForConfirmation: true, assertHalt: true });

function readTokenArtifacts(repoRoot) {
  const tokenDir = path.join(repoRoot, 'tokens', 'TestAllowanceToken');
  const outputDir = path.join(tokenDir, 'bin', 'sc');
  const nccsPath = path.join(process.env.HOME || '', '.dotnet', 'tools', 'nccs');
  execFileSync(nccsPath, [
    path.join(tokenDir, 'TestAllowanceToken.csproj'),
    '-o',
    outputDir,
    '--base-name',
    'TestAllowanceToken',
    '--assembly',
  ], {
    cwd: repoRoot,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  return {
    nefPath: path.join(outputDir, 'TestAllowanceToken.nef'),
    manifestPath: path.join(outputDir, 'TestAllowanceToken.manifest.json'),
    nefBytes: fs.readFileSync(path.join(outputDir, 'TestAllowanceToken.nef')),
    manifestString: fs.readFileSync(path.join(outputDir, 'TestAllowanceToken.manifest.json'), 'utf8'),
  };
}

function buildAaExecutionContext(aaHash, tokenHash, ownerScriptHash, accountInfo) {
  return {
    signers: [
      { account: ownerScriptHash, scopes: tx.WitnessScope.CalledByEntry },
      {
        account: accountInfo.addressScriptHash,
        scopes: tx.WitnessScope.CustomContracts,
        allowedContracts: [sanitizeHex(aaHash), sanitizeHex(tokenHash)],
      },
    ],
    witnesses: [{ invocationScript: '', verificationScript: accountInfo.verificationScript }],
  };
}

async function deployToken({ owner, magic, nefBase64, manifestString }) {
  const manifest = JSON.parse(manifestString);
  manifest.name = `${manifest.name}-${Date.now()}`;
  const script = buildDeployScript({ sc, nefBase64, manifestString: JSON.stringify(manifest) });
  const signers = [{ account: owner.scriptHash, scopes: tx.WitnessScope.Global }];
  const simulation = await rpcClient.invokeScript(u.HexString.fromHex(script), signers);
  if (simulation?.state === 'FAULT') {
    throw new Error(`token deploy simulation fault: ${simulation.exception}`);
  }
  const currentHeight = await rpcClient.getBlockCount();
  const { txid, networkFee } = await sendTransaction({
    rpcClient,
    txModule: tx,
    account: owner,
    magic,
    signers,
    validUntilBlock: currentHeight + 1000,
    script,
    systemFee: simulation?.gasconsumed || '1000000',
  });
  const appLog = await waitForTx(rpcClient, txid);
  assertVmStateHalt(appLog, 'token deploy tx');
  const deployedHash = extractDeployedContractHash(appLog);
  if (!deployedHash) throw new Error('Unable to extract deployed token hash');
  return { txid, systemFee: simulation?.gasconsumed, networkFee, appLog, deployedHash };
}

async function main() {
  const repoRoot = path.resolve(__dirname, '../../..');
  const envValues = parseEnvFile(path.join(repoRoot, '.env'));
  const aaHashRaw = process.env.AA_HASH_TESTNET || envValues.AA_HASH_TESTNET || envValues.VITE_AA_HASH_TESTNET || '';
  const aaHash = sanitizeHex(aaHashRaw);
  if (!/^[0-9a-f]{40}$/.test(aaHash)) throw new Error(`Invalid testnet AA hash: ${aaHashRaw}`);

  const wif = process.env.TEST_WIF;
  if (!wif) throw new Error('TEST_WIF required');

  const owner = new wallet.Account(wif);
  const ownerScriptHash = sanitizeHex(owner.scriptHash);
  const spender = new wallet.Account();
  const magic = await getNetworkMagic();

  const summary = {
    rpcUrl,
    aaHash: `0x${aaHash}`,
    ownerAddress: owner.address,
    ownerScriptHash: `0x${ownerScriptHash}`,
    spenderAddress: spender.address,
    spenderScriptHash: `0x${sanitizeHex(spender.scriptHash)}`,
    account: null,
    token: null,
    txs: [],
    checks: [],
    simulations: [],
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

  summary.txs.push({
    step: 'createAccountWithAddress(approve-allowance)',
    ...(await sendInvocation({
      account: owner,
      magic,
      aaHash,
      operation: 'createAccountWithAddress',
      args: [
        cpByteArray(accountIdHex),
        cpHash160(accountInfo.addressScriptHash),
        cpArray([cpHash160(ownerScriptHash)]),
        sc.ContractParam.integer(1),
        cpArray([]),
        sc.ContractParam.integer(0),
      ],
    })),
  });

  const tokenArtifacts = readTokenArtifacts(repoRoot);
  const tokenDeploy = await deployToken({
    owner,
    magic,
    nefBase64: tokenArtifacts.nefBytes.toString('base64'),
    manifestString: tokenArtifacts.manifestString,
  });
  summary.txs.push({ step: 'deploy TestAllowanceToken', ...tokenDeploy });
  summary.token = { deployedHash: tokenDeploy.deployedHash };

  const executionContext = buildAaExecutionContext(aaHash, tokenDeploy.deployedHash, owner.scriptHash, accountInfo);
  const withinLimit = 100;
  const overLimit = 101;

  const ownerBalance = await invokeRead(tokenDeploy.deployedHash, 'balanceOf', [cpHash160(owner.scriptHash)]);
  const initialAllowance = await invokeRead(tokenDeploy.deployedHash, 'allowance', [cpHash160(accountInfo.addressScriptHash), cpHash160(spender.scriptHash)]);
  check('deployer token balance seeded on deploy', Number(ownerBalance.stack?.[0]?.value || '0') > 0, String(ownerBalance.stack?.[0]?.value || '0'));
  check('initial allowance is zero', String(initialAllowance.stack?.[0]?.value || '0') === '0');

  summary.txs.push({
    step: 'setMaxTransferByAddress(token, withinLimit)',
    ...(await sendInvocation({
      account: owner,
      magic,
      aaHash,
      operation: 'setMaxTransferByAddress',
      args: [cpHash160(accountInfo.addressScriptHash), cpHash160(tokenDeploy.deployedHash), sc.ContractParam.integer(withinLimit)],
    })),
  });

  const approveWithinArgs = [
    cpHash160(accountInfo.addressScriptHash),
    cpHash160(tokenDeploy.deployedHash),
    sc.ContractParam.string('approve'),
    cpArray([
      cpHash160(accountInfo.addressScriptHash),
      cpHash160(spender.scriptHash),
      sc.ContractParam.integer(withinLimit),
    ]),
  ];

  const approveOverArgs = [
    cpHash160(accountInfo.addressScriptHash),
    cpHash160(tokenDeploy.deployedHash),
    sc.ContractParam.string('approve'),
    cpArray([
      cpHash160(accountInfo.addressScriptHash),
      cpHash160(spender.scriptHash),
      sc.ContractParam.integer(overLimit),
    ]),
  ];

  const approveWithinSim = await simulate(aaHash, 'executeByAddress', approveWithinArgs, executionContext.signers);
  summary.simulations.push({ name: 'approve within limit', state: approveWithinSim.state, exception: approveWithinSim.exception || null, stack: approveWithinSim.stack || [] });
  check('approve within limit sim HALTs', approveWithinSim.state === 'HALT', approveWithinSim.exception || '');
  check('approve within limit sim returns true', approveWithinSim.stack?.[0]?.type === 'Boolean' && approveWithinSim.stack?.[0]?.value === true, JSON.stringify(approveWithinSim.stack || []));

  const approveOverSim = await simulate(aaHash, 'executeByAddress', approveOverArgs, executionContext.signers);
  summary.simulations.push({ name: 'approve over limit', state: approveOverSim.state, exception: approveOverSim.exception || null, stack: approveOverSim.stack || [] });
  check('approve over limit sim FAULTs', approveOverSim.state === 'FAULT', approveOverSim.exception || 'expected FAULT');
  check('approve over limit reason mentions max limit', String(approveOverSim.exception || '').includes('Amount exceeds max limit'), approveOverSim.exception || '');

  const approveTx = await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'executeByAddress',
    args: approveWithinArgs,
    signers: executionContext.signers,
    witnesses: executionContext.witnesses,
  });
  summary.txs.push({ step: 'executeByAddress approve within limit', txid: approveTx.txid, systemFee: approveTx.systemFee, networkFee: approveTx.networkFee, appLog: approveTx.appLog });
  check('live approve execution returns true', approveTx.appLog.executions?.[0]?.stack?.[0]?.type === 'Boolean' && approveTx.appLog.executions?.[0]?.stack?.[0]?.value === true, JSON.stringify(approveTx.appLog.executions?.[0]?.stack || []));

  const allowanceAfterApprove = await invokeRead(tokenDeploy.deployedHash, 'allowance', [cpHash160(accountInfo.addressScriptHash), cpHash160(spender.scriptHash)]);
  check('allowance after approve equals withinLimit', String(allowanceAfterApprove.stack?.[0]?.value || '0') === String(withinLimit), String(allowanceAfterApprove.stack?.[0]?.value || '0'));

  const allowanceAfterOverSim = await invokeRead(tokenDeploy.deployedHash, 'allowance', [cpHash160(accountInfo.addressScriptHash), cpHash160(spender.scriptHash)]);
  check('failed over-limit approve leaves allowance unchanged', String(allowanceAfterOverSim.stack?.[0]?.value || '0') === String(withinLimit), String(allowanceAfterOverSim.stack?.[0]?.value || '0'));

  summary.result = 'PASS';
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('[aa_testnet_approve_allowance_validate] FAILED');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
