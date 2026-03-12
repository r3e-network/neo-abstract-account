const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { rpc, tx, wallet, sc, u } = require('@cityofzion/neon-js');
const { sanitizeHex } = require('../src/metaTx');
const { extractDeployedContractHash } = require('../src/deployLog');
const { parseEnvFile } = require('./env');
const { assertVmStateHalt, waitForTx, sendTransaction } = require('./tx');
const { bindRpcHelpers } = require('./rpc');
const { bindParamHelpers } = require('./params');
const { bindAccountHelpers } = require('./account');
const { bindStackHelpers } = require('./stack');
const { bindInvocationHelpers } = require('./invoke');
const { bindWhitelistArgBuilders } = require('./whitelistArgs');
const { CONTRACT_MANAGEMENT_HASH, buildDeployScript } = require('./deployHelpers');

const rpcUrl = 'https://testnet1.neo.coz.io:443';
const rpcClient = new rpc.RPCClient(rpcUrl);
const { getNetworkMagic, invokeRead, simulate } = bindRpcHelpers({ rpcClient, rpc, sc, u });
const { cpHash160, cpByteArray, cpByteArrayRaw, cpArray } = bindParamHelpers({ sc, u, sanitizeHex });
const { randomAccountIdHex, deriveAaAddressFromId } = bindAccountHelpers({ crypto: require('node:crypto'), sc, u, wallet, sanitizeHex, cpByteArray });
const { decodeByteStringToHex, decodeInteger, normalizeReadByteString } = bindStackHelpers({ sanitizeHex, u });
const { sendInvocation } = bindInvocationHelpers({ rpcClient, txModule: tx, sc, u, sendTransaction, waitForTx, assertVmStateHalt, waitForConfirmation: true, assertHalt: true });
const { buildSetWhitelistByAddressArgs, buildSetWhitelistModeByAddressArgs } = bindWhitelistArgBuilders({ cpHash160, cpByteArray, cpByteArrayRaw: cpByteArray, cpArray, sc });
const GAS_TOKEN_HASH = 'd2a4cff31913016155e38e474a2c06d08be276cf';

function readVerifierArtifacts(repoRoot) {
  const verifierDir = path.join(repoRoot, 'verifiers', 'AllowAllVerifier');
  const outputDir = path.join(verifierDir, 'bin', 'sc');
  const nccsPath = path.join(process.env.HOME || '', '.dotnet', 'tools', 'nccs');
  execFileSync(nccsPath, [
    path.join(verifierDir, 'AllowAllVerifier.csproj'),
    '-o',
    outputDir,
    '--base-name',
    'AllowAllVerifier',
    '--assembly',
  ], {
    cwd: repoRoot,
    stdio: 'pipe',
    encoding: 'utf8',
  });

  const nefPath = path.join(outputDir, 'AllowAllVerifier.nef');
  const manifestPath = path.join(outputDir, 'AllowAllVerifier.manifest.json');
  return {
    nefPath,
    manifestPath,
    nefBytes: fs.readFileSync(nefPath),
    manifestString: fs.readFileSync(manifestPath, 'utf8'),
  };
}

async function deployVerifier({ owner, magic, nefBase64, manifestString }) {
  const script = buildDeployScript({ sc, nefBase64, manifestString });
  const signers = [{ account: owner.scriptHash, scopes: tx.WitnessScope.Global }];
  const simulation = await rpcClient.invokeScript(u.HexString.fromHex(script), signers);
  if (simulation?.state === 'FAULT') {
    throw new Error(`verifier deploy simulation fault: ${simulation.exception}`);
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
  assertVmStateHalt(appLog, 'verifier deploy tx');
  const deployedHash = extractDeployedContractHash(appLog);
  if (!deployedHash) {
    throw new Error('Unable to extract deployed verifier hash from deploy app log');
  }

  return {
    txid,
    systemFee: simulation?.gasconsumed,
    networkFee,
    deployedHash,
    appLog,
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

  const owner = new wallet.Account(wif);
  const ownerScriptHash = sanitizeHex(owner.scriptHash);
  const magic = await getNetworkMagic();
  const accountIdHex = randomAccountIdHex(16);
  const accountInfo = deriveAaAddressFromId(aaHash, accountIdHex);
  const verifierArtifacts = readVerifierArtifacts(repoRoot);

  const summary = {
    rpcUrl,
    aaHash: `0x${aaHash}`,
    ownerAddress: owner.address,
    ownerScriptHash: `0x${ownerScriptHash}`,
    account: {
      accountIdHex,
      accountAddress: accountInfo.address,
      accountAddressScriptHash: `0x${accountInfo.addressScriptHash}`,
    },
    verifier: {
      nefPath: verifierArtifacts.nefPath,
      manifestPath: verifierArtifacts.manifestPath,
    },
    txs: [],
    checks: [],
    simulations: [],
  };

  const check = (name, condition, details = null) => {
    summary.checks.push({ name, pass: !!condition, details });
    if (!condition) throw new Error(`Check failed: ${name}${details ? ` :: ${details}` : ''}`);
  };

  summary.txs.push({
    step: 'createAccountWithAddress(custom-verifier)',
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
    step: 'setWhitelistByAddress(self, aaHash, true)',
    ...(await sendInvocation({
      account: owner,
      magic,
      aaHash,
      operation: 'setWhitelistByAddress',
      args: buildSetWhitelistByAddressArgs(accountInfo.addressScriptHash, aaHash, true),
    })),
  });

  const manifest = JSON.parse(verifierArtifacts.manifestString);
  manifest.name = `${manifest.name}-${Date.now()}`;

  const deployResult = await deployVerifier({
    owner,
    magic,
    nefBase64: verifierArtifacts.nefBytes.toString('base64'),
    manifestString: JSON.stringify(manifest),
  });
  summary.verifier = {
    ...summary.verifier,
    manifestName: manifest.name,
    deployedHash: deployResult.deployedHash,
  };
  summary.txs.push({ step: 'deploy AllowAllVerifier', ...deployResult });

  summary.txs.push({
    step: 'bind verifier by address',
    ...(await sendInvocation({
      account: owner,
      magic,
      aaHash,
      operation: 'setVerifierContractByAddress',
      args: [cpHash160(accountInfo.addressScriptHash), cpHash160(deployResult.deployedHash)],
    })),
  });

  summary.txs.push({
    step: 'setWhitelistModeByAddress(native)',
    ...(await sendInvocation({
      account: owner,
      magic,
      aaHash,
      operation: 'setWhitelistModeByAddress',
      args: buildSetWhitelistModeByAddressArgs(accountInfo.addressScriptHash, true),
    })),
  });

  const verifierRead = await invokeRead(aaHash, 'getVerifierContractByAddress', [cpHash160(accountInfo.addressScriptHash)]);
  const verifierReadHex = decodeByteStringToHex(verifierRead.stack?.[0]);
  const verifierReadNormalized = normalizeReadByteString(verifierReadHex);
  check('verifier contract binding matches deployed hash', verifierReadNormalized === sanitizeHex(deployResult.deployedHash), verifierReadHex);

  summary.txs.push({
    step: 'setSignersByAddress(proxy-only)',
    ...(await sendInvocation({
      account: owner,
      magic,
      aaHash,
      operation: 'setSignersByAddress',
      args: [
        cpHash160(accountInfo.addressScriptHash),
        cpArray([cpHash160(accountInfo.addressScriptHash)]),
        sc.ContractParam.integer(1),
      ],
    })),
  });

  const threshold = await invokeRead(aaHash, 'getThresholdByAddress', [cpHash160(accountInfo.addressScriptHash)]);
  const signersRead = await invokeRead(aaHash, 'getSignersByAddress', [cpHash160(accountInfo.addressScriptHash)]);
  check('proxy-only admin threshold == 1', String(threshold.stack?.[0]?.value || '') === '1');
  check('proxy-only admin list count == 1', (signersRead.stack?.[0]?.value || []).length === 1);

  const ownerOnlyMutation = await simulate(
    aaHash,
    'setWhitelistModeByAddress',
    buildSetWhitelistModeByAddressArgs(accountInfo.addressScriptHash, true),
    [{ account: owner.scriptHash, scopes: tx.WitnessScope.CalledByEntry }]
  );
  summary.simulations.push({
    name: 'owner direct admin mutation via custom verifier',
    state: ownerOnlyMutation.state,
    exception: ownerOnlyMutation.exception || null,
  });
  check('custom verifier authorizes direct admin mutation after native owner removal', ownerOnlyMutation.state === 'HALT', ownerOnlyMutation.exception || 'expected HALT');

  const allowedCustomVerifierExec = await simulate(
    aaHash,
    'executeByAddress',
    [
      cpHash160(accountInfo.addressScriptHash),
      cpHash160(aaHash),
      sc.ContractParam.string('getNonce'),
      cpArray([cpHash160(ownerScriptHash)]),
    ],
    [{ account: owner.scriptHash, scopes: tx.WitnessScope.CalledByEntry }]
  );
  summary.simulations.push({
    name: 'executeByAddress self getNonce with custom verifier',
    state: allowedCustomVerifierExec.state,
    exception: allowedCustomVerifierExec.exception || null,
  });
  check('custom verifier allows executeByAddress to whitelisted self target', allowedCustomVerifierExec.state === 'HALT', allowedCustomVerifierExec.exception || '');

  summary.txs.push({
    step: 'executeByAddress self getNonce via custom verifier',
    ...(await sendInvocation({
      account: owner,
      magic,
      aaHash,
      operation: 'executeByAddress',
      args: [
        cpHash160(accountInfo.addressScriptHash),
        cpHash160(aaHash),
        sc.ContractParam.string('getNonce'),
        cpArray([cpHash160(ownerScriptHash)]),
      ],
      signers: [{ account: owner.scriptHash, scopes: tx.WitnessScope.CalledByEntry }],
    })),
  });

  const blockedCustomVerifierExec = await simulate(
    aaHash,
    'executeByAddress',
    [
      cpHash160(accountInfo.addressScriptHash),
      cpHash160(GAS_TOKEN_HASH),
      sc.ContractParam.string('balanceOf'),
      cpArray([cpHash160(ownerScriptHash)]),
    ],
    [{ account: owner.scriptHash, scopes: tx.WitnessScope.CalledByEntry }]
  );
  summary.simulations.push({
    name: 'executeByAddress blocked by whitelist under custom verifier',
    state: blockedCustomVerifierExec.state,
    exception: blockedCustomVerifierExec.exception || null,
  });
  check('custom verifier does not bypass whitelist runtime restrictions', blockedCustomVerifierExec.state === 'FAULT', blockedCustomVerifierExec.exception || 'expected FAULT');
  check('blocked custom verifier execution fails for whitelist reason', String(blockedCustomVerifierExec.exception || '').includes('whitelist'), blockedCustomVerifierExec.exception || '');

  const nonceRead = await invokeRead(aaHash, 'getNonceForAddress', [cpHash160(accountInfo.addressScriptHash), cpHash160(ownerScriptHash)]);
  summary.account.ownerNonceByAddress = String(decodeInteger(nonceRead.stack?.[0]));

  summary.result = 'PASS';
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('[aa_testnet_custom_verifier_validate] FAILED');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
