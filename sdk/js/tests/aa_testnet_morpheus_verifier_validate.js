const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
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
const { buildDeployScript } = require('./deployHelpers');

const rpcUrl = 'https://testnet1.neo.coz.io:443';
const rpcClient = new rpc.RPCClient(rpcUrl);
const { getNetworkMagic, invokeRead, simulate } = bindRpcHelpers({ rpcClient, rpc, sc, u });
const { cpHash160, cpByteArray, cpByteArrayRaw, cpArray } = bindParamHelpers({ sc, u, sanitizeHex });
const { randomAccountIdHex, deriveAaAddressFromId } = bindAccountHelpers({ crypto, sc, u, wallet, sanitizeHex, cpByteArray });
const { decodeByteStringToHex, decodeInteger, normalizeReadByteString } = bindStackHelpers({ sanitizeHex, u });
const { sendInvocation } = bindInvocationHelpers({ rpcClient, txModule: tx, sc, u, sendTransaction, waitForTx, assertVmStateHalt, waitForConfirmation: true, assertHalt: true });
const { buildSetWhitelistByAddressArgs, buildSetWhitelistModeByAddressArgs } = bindWhitelistArgBuilders({ cpHash160, cpByteArray, cpByteArrayRaw: cpByteArray, cpArray, sc });

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

function readVerifierArtifacts(repoRoot) {
  execFileSync('bash', ['contracts/recovery/compile_recovery_contracts.sh'], {
    cwd: repoRoot,
    stdio: 'pipe',
    encoding: 'utf8',
  });

  const compiledDir = path.join(repoRoot, 'contracts', 'recovery', 'compiled');
  const nefPath = path.join(compiledDir, 'MorpheusSocialRecoveryVerifier.nef');
  const manifestPath = path.join(compiledDir, 'MorpheusSocialRecoveryVerifier.manifest.json');
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
    throw new Error(`Morpheus verifier deploy simulation fault: ${simulation.exception}`);
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
  assertVmStateHalt(appLog, 'Morpheus verifier deploy tx');
  const deployedHash = extractDeployedContractHash(appLog);
  if (!deployedHash) {
    throw new Error('Unable to extract Morpheus verifier hash from deploy app log');
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

  const testWif = process.env.TEST_WIF;
  if (!testWif) throw new Error('TEST_WIF required');

  const owner = new wallet.Account(testWif);
  const ownerScriptHash = sanitizeHex(owner.scriptHash);
  const morpheusOracleHash = sanitizeHex(
    process.env.MORPHEUS_ORACLE_HASH_TESTNET
    || process.env.CONTRACT_MORPHEUS_ORACLE_HASH
    || envValues.CONTRACT_MORPHEUS_ORACLE_HASH
    || aaHashRaw
    || ''
  );
  const morpheusVerifierPubKey = process.env.MORPHEUS_VERIFIER_PUBKEY_TESTNET || owner.publicKey;
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
    morpheus: {
      oracleHash: `0x${morpheusOracleHash}`,
      verifierPubKey: morpheusVerifierPubKey,
      note: morpheusOracleHash === aaHash ? 'oracle hash fell back to AA hash; update MORPHEUS_ORACLE_HASH_TESTNET for full integration runs' : 'oracle hash supplied',
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
  const globalSigner = [{ account: owner.scriptHash, scopes: tx.WitnessScope.Global }];

  summary.txs.push({
    step: 'createAccountWithAddress(morpheus-verifier)',
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
  summary.txs.push({ step: 'deploy MorpheusSocialRecoveryVerifier', ...deployResult });

  const factorA = sha256Hex(`morpheus-factor-a:${accountIdHex}`);
  const factorB = sha256Hex(`morpheus-factor-b:${accountIdHex}`);

  summary.txs.push({
    step: 'setupRecovery',
    ...(await sendInvocation({
      account: owner,
      magic,
      scriptHash: sanitizeHex(deployResult.deployedHash),
      operation: 'setupRecovery',
      args: [
        cpByteArrayRaw(accountIdHex),
        sc.ContractParam.string(accountIdHex),
        sc.ContractParam.string('neo_n3'),
        cpHash160(ownerScriptHash),
        cpHash160(aaHash),
        cpHash160(accountInfo.addressScriptHash),
        cpHash160(morpheusOracleHash),
        sc.ContractParam.array(
          sc.ContractParam.byteArray(u.HexString.fromHex(factorA, false)),
          sc.ContractParam.byteArray(u.HexString.fromHex(factorB, false)),
        ),
        sc.ContractParam.integer(2),
        sc.ContractParam.integer(3600),
        sc.ContractParam.publicKey(morpheusVerifierPubKey),
      ],
    })),
  });

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
      signers: globalSigner,
    })),
  });

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
      signers: globalSigner,
    })),
  });

  const verifierRead = await invokeRead(aaHash, 'getVerifierContractByAddress', [cpHash160(accountInfo.addressScriptHash)]);
  const verifierReadHex = decodeByteStringToHex(verifierRead.stack?.[0]);
  const verifierReadNormalized = normalizeReadByteString(verifierReadHex);
  check('AA account is bound to deployed Morpheus verifier', verifierReadNormalized === sanitizeHex(deployResult.deployedHash), verifierReadHex);

  const ownerRes = await invokeRead(sanitizeHex(deployResult.deployedHash), 'getOwner', [cpByteArrayRaw(accountIdHex)]);
  const ownerHex = decodeByteStringToHex(ownerRes.stack?.[0]);
  check('verifier owner matches setup owner', ownerHex === sanitizeHex(u.reverseHex(owner.scriptHash)), ownerHex);

  const oracleRes = await invokeRead(sanitizeHex(deployResult.deployedHash), 'getMorpheusOracle', [cpByteArrayRaw(accountIdHex)]);
  const oracleHex = decodeByteStringToHex(oracleRes.stack?.[0]);
  check('verifier stores configured Morpheus oracle hash', oracleHex === sanitizeHex(u.reverseHex(morpheusOracleHash)), oracleHex);

  const thresholdRes = await invokeRead(sanitizeHex(deployResult.deployedHash), 'getThreshold', [cpByteArrayRaw(accountIdHex)]);
  check('recovery threshold stored', String(thresholdRes.stack?.[0]?.value || '') === '2');

  const timelockRes = await invokeRead(sanitizeHex(deployResult.deployedHash), 'getTimelock', [cpByteArrayRaw(accountIdHex)]);
  check('recovery timelock stored', String(timelockRes.stack?.[0]?.value || '') === '3600');

  const recoveryNonceRes = await invokeRead(sanitizeHex(deployResult.deployedHash), 'getRecoveryNonce', [cpByteArrayRaw(accountIdHex)]);
  check('recovery nonce starts at zero', String(recoveryNonceRes.stack?.[0]?.value || '') === '0');

  const sessionNonceRes = await invokeRead(sanitizeHex(deployResult.deployedHash), 'getSessionNonce', [cpByteArrayRaw(accountIdHex)]);
  check('session nonce starts at zero', String(sessionNonceRes.stack?.[0]?.value || '') === '0');

  const factorsRes = await invokeRead(sanitizeHex(deployResult.deployedHash), 'getMasterNullifiers', [cpByteArrayRaw(accountIdHex)]);
  check('master nullifier factor set stored', Array.isArray(factorsRes.stack?.[0]?.value) && factorsRes.stack[0].value.length === 2);

  const ownerAdminMutation = await simulate(
    aaHash,
    'setWhitelistModeByAddress',
    buildSetWhitelistModeByAddressArgs(accountInfo.addressScriptHash, true),
    globalSigner,
  );
  summary.simulations.push({
    name: 'owner direct admin mutation via Morpheus verifier',
    state: ownerAdminMutation.state,
    exception: ownerAdminMutation.exception || null,
  });
  check('Morpheus verifier authorizes admin mutation after native owner removal', ownerAdminMutation.state === 'HALT', ownerAdminMutation.exception || 'expected HALT');

  const selfExecution = await simulate(
    aaHash,
    'executeByAddress',
    [
      cpHash160(accountInfo.addressScriptHash),
      cpHash160(aaHash),
      sc.ContractParam.string('getNonce'),
      cpArray([cpHash160(ownerScriptHash)]),
    ],
    globalSigner,
  );
  summary.simulations.push({
    name: 'executeByAddress self getNonce with Morpheus verifier',
    state: selfExecution.state,
    exception: selfExecution.exception || null,
  });
  check('Morpheus verifier allows AA wrapper execution', selfExecution.state === 'HALT', selfExecution.exception || '');

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('[aa_testnet_morpheus_verifier_validate] FAILED');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
