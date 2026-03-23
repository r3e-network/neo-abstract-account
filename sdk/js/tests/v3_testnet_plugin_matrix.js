#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { rpc, sc, wallet, experimental, tx, u, CONST } = require('../src/neonCompat');
const { ethers } = require('ethers');

const { extractDeployedContractHash } = require('../src/deployLog');
const { AbstractAccountClient } = require('../src/index');
const { buildV3UserOperationTypedData, sanitizeHex } = require('../src/metaTx');

const RPC_URL = process.env.TESTNET_RPC_URL || 'https://testnet1.neo.coz.io:443';
const TEST_WIF = process.env.TEST_WIF || '';
const REPORT_DIR = path.resolve(__dirname, '..', '..', 'docs', 'reports');

if (!TEST_WIF) {
  console.error('TEST_WIF is required.');
  process.exit(1);
}

const GAS_HASH = CONST.NATIVE_CONTRACT_HASH.GasToken;
const STDLIB_HASH = CONST.NATIVE_CONTRACT_HASH.StdLib;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableRpcError(error) {
  const message = error instanceof Error ? error.message : String(error || '');
  return /socket hang up|ECONNRESET|ETIMEDOUT|fetch failed|network error|EAI_AGAIN|ECONNREFUSED/i.test(message);
}

async function withRpcRetry(label, fn, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableRpcError(error) || attempt >= attempts) throw error;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[rpc-retry] ${label} attempt ${attempt}/${attempts} failed: ${message}`);
      await sleep(1500 * attempt);
    }
  }
  throw lastError;
}

function repoRoot() {
  return path.resolve(__dirname, '..', '..', '..');
}

function artifactPaths(baseName) {
  return {
    nef: path.join(repoRoot(), 'contracts', 'bin', 'v3', `${baseName}.nef`),
    manifest: path.join(repoRoot(), 'contracts', 'bin', 'v3', `${baseName}.manifest.json`),
  };
}

function loadArtifact(baseName, uniqueSuffix) {
  const paths = artifactPaths(baseName);
  const nef = sc.NEF.fromBuffer(fs.readFileSync(paths.nef));
  const manifestJson = JSON.parse(fs.readFileSync(paths.manifest, 'utf8'));
  manifestJson.name = `${manifestJson.name}-${uniqueSuffix}`;
  const manifest = sc.ContractManifest.fromJson(manifestJson);
  return { nef, manifest };
}

function normalizeHash(value) {
  const hex = sanitizeHex(value || '');
  return hex ? `0x${hex}` : '';
}

function reverseHex(hexValue) {
  return sanitizeHex(hexValue).match(/../g).reverse().join('');
}

function buildConfig(account, networkMagic) {
  return {
    account,
    networkMagic,
    rpcAddress: RPC_URL,
    blocksTillExpiry: 200,
  };
}

function stackItemToText(item) {
  if (!item) return '';
  if (item.type === 'Integer') return String(item.value || '0');
  if (item.type === 'Boolean') return String(item.value);
  if (item.type === 'Hash160') return normalizeHash(item.value);
  if (item.type === 'ByteString') {
    const hex = Buffer.from(item.value || '', 'base64').toString('hex');
    if (!hex) return '';
    const utf8 = Buffer.from(hex, 'hex').toString('utf8');
    return /^[\x20-\x7E]+$/.test(utf8) ? utf8 : `0x${hex}`;
  }
  return JSON.stringify(item);
}

async function waitForAppLog(client, txid, label, timeoutMs = 300000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const appLog = await client.getApplicationLog(txid);
      if (appLog?.executions?.length) return appLog;
    } catch (_) {}
    await sleep(3000);
  }
  throw new Error(`${label}: timed out waiting for application log for ${txid}`);
}

function assertVmState(appLog, label, expected = 'HALT') {
  const execution = appLog?.executions?.[0];
  if (!execution) throw new Error(`${label}: missing execution log`);
  const vmState = String(execution.vmstate || execution.state || '');
  if (!vmState.includes(expected)) {
    throw new Error(`${label}: expected ${expected}, got ${vmState} ${execution.exception || ''}`.trim());
  }
  return execution;
}

function makeSigner(scriptHash) {
  return { account: scriptHash, scopes: tx.WitnessScope.CalledByEntry };
}

function hash160Param(value) {
  return sc.ContractParam.hash160(sanitizeHex(value));
}

function byteArrayParam(hexValue) {
  return sc.ContractParam.byteArray(u.HexString.fromHex(sanitizeHex(hexValue), true));
}

function integerParam(value) {
  if (typeof value === 'bigint') return sc.ContractParam.integer(value.toString());
  return sc.ContractParam.integer(value);
}

function boolParam(value) {
  return sc.ContractParam.boolean(Boolean(value));
}

function stringParam(value) {
  return sc.ContractParam.string(String(value));
}

function anyParam(value) {
  return sc.ContractParam.any(value);
}

function arrayParam(values = []) {
  return sc.ContractParam.array(...values);
}

function emptyByteArrayParam() {
  return sc.ContractParam.byteArray(u.HexString.fromHex('', true));
}

function userOpParam({ targetContract, method, args = [], nonce = 0n, deadline = 0n, signatureHex = '' }) {
  return arrayParam([
    hash160Param(targetContract),
    stringParam(method),
    arrayParam(args),
    integerParam(nonce),
    integerParam(deadline),
    byteArrayParam(signatureHex),
  ]);
}

async function deployContract(client, account, networkMagic, baseName, uniqueSuffix) {
  const { nef, manifest } = loadArtifact(baseName, uniqueSuffix);
  const predictedHash = normalizeHash(experimental.getContractHash(account.scriptHash, nef.checksum, manifest.name));
  console.log(`Deploying ${baseName} (${manifest.name})...`);
  const txid = await withRpcRetry(`deploy ${baseName}`, () => experimental.deployContract(nef, manifest, buildConfig(account, networkMagic)));
  const appLog = await waitForAppLog(client, txid, `deploy ${baseName}`);
  assertVmState(appLog, `deploy ${baseName}`, 'HALT');
  const deployedHash = extractDeployedContractHash(appLog) || predictedHash;
  console.log(`Deployed ${baseName}: ${deployedHash} via ${txid}`);
  return { txid, hash: normalizeHash(deployedHash), manifestName: manifest.name };
}

async function invokeRead(client, contractHash, operation, params = [], signers = undefined) {
  return withRpcRetry(`${sanitizeHex(contractHash)}.${operation}`, () => client.invokeFunction(sanitizeHex(contractHash), operation, params, signers));
}

async function readAndDecode(client, contractHash, operation, params = [], signers = undefined) {
  const result = await invokeRead(client, contractHash, operation, params, signers);
  const state = String(result?.state || '');
  if (state.includes('FAULT')) {
    throw new Error(`${operation} fault: ${result.exception || 'VM fault'}`);
  }
  return result?.stack?.[0];
}

async function invokePersisted(client, contractHash, account, networkMagic, operation, params = [], signers = undefined) {
  const contract = new experimental.SmartContract(sanitizeHex(contractHash), buildConfig(account, networkMagic));
  const txid = await withRpcRetry(`${sanitizeHex(contractHash)}.${operation}.invoke`, () => contract.invoke(operation, params, signers));
  const appLog = await waitForAppLog(client, txid, `${operation}`);
  const execution = assertVmState(appLog, `${operation}`, 'HALT');
  return { txid, appLog, execution };
}

async function testInvoke(client, contractHash, account, networkMagic, operation, params = [], signers = undefined) {
  const contract = new experimental.SmartContract(sanitizeHex(contractHash), buildConfig(account, networkMagic));
  return withRpcRetry(`${sanitizeHex(contractHash)}.${operation}.testInvoke`, () => contract.testInvoke(operation, params, signers));
}

function compactSignature(signature) {
  const parsed = ethers.Signature.from(signature);
  return `${sanitizeHex(parsed.r)}${sanitizeHex(parsed.s)}`;
}

function randomAccountId() {
  return Buffer.from(ethers.randomBytes(20)).toString('hex');
}

function validationRunId() {
  return (process.env.AA_VALIDATION_RUN_ID || Date.now().toString(36)).toLowerCase();
}

function logSection(title) {
  console.log(`\n== ${title} ==`);
}

function bigIntToNeoLE(value) {
  let next = BigInt(value);
  if (next === 0n) return Buffer.from([0]);
  let hex = next.toString(16);
  if (hex.length % 2 !== 0) hex = `0${hex}`;
  let out = Buffer.from(hex, 'hex').reverse();
  if (out[out.length - 1] & 0x80) {
    out = Buffer.concat([out, Buffer.from([0])]);
  }
  return out;
}

async function stdLibSerialize(client, param) {
  const result = await invokeRead(client, STDLIB_HASH, 'serialize', [param]);
  const state = String(result?.state || '');
  if (state.includes('FAULT')) {
    throw new Error(`StdLib.serialize fault: ${result.exception || 'VM fault'}`);
  }
  return Buffer.from(result?.stack?.[0]?.value || '', 'base64');
}

function base64UrlDecode(value) {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${pad}`, 'base64');
}

function createP256Signer() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' });
  const x = base64UrlDecode(jwk.x);
  const y = base64UrlDecode(jwk.y);
  const prefix = (y[y.length - 1] & 1) === 1 ? 0x03 : 0x02;
  const compressed = Buffer.concat([Buffer.from([prefix]), x]).toString('hex');
  return { privateKey, compressedPublicKey: compressed };
}

async function buildP256Payload(client, { accountId, targetContract, method, args, nonce, deadline }) {
  const methodBytes = await stdLibSerialize(client, stringParam(method));
  const argsBytes = await stdLibSerialize(client, arrayParam(args));
  return Buffer.concat([
    Buffer.from(reverseHex(accountId), 'hex'),
    Buffer.from(reverseHex(targetContract), 'hex'),
    methodBytes,
    argsBytes,
    bigIntToNeoLE(nonce),
    bigIntToNeoLE(deadline),
  ]);
}

function signP256Payload(privateKey, payload) {
  return crypto.sign('sha256', payload, { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('hex');
}

function expectedSubscriptionNonce(subIdHex, periodMs, runtimeMs = Date.now()) {
  const digest = crypto.createHash('sha256').update(Buffer.from(sanitizeHex(subIdHex), 'hex')).digest();
  let subTag = 0n;
  for (let i = 0; i < 8; i += 1) {
    subTag = (subTag << 8n) + BigInt(digest[i]);
  }
  const currentPeriod = BigInt(Math.floor(runtimeMs / Number(periodMs)));
  return 1_000_000_000_000_000_000n + (subTag << 32n) + currentPeriod;
}

async function getLatestBlockTimeMs(rpcClient) {
  try {
    const latestHeight = Number(await withRpcRetry('rpc.getBlockCount', () => rpcClient.getBlockCount())) - 1;
    const block = await withRpcRetry('rpc.getBlock', () => rpcClient.getBlock(latestHeight, 1));
    const raw = Number(block?.time ?? block?.timestamp ?? 0);
    if (Number.isFinite(raw) && raw > 0) return raw;
  } catch {
    // fall back to local wall clock if the RPC helper is unavailable
  }
  return Date.now();
}

function assertFaultResult(result, label, pattern) {
  const state = String(result?.state || '');
  if (!state.includes('FAULT')) {
    throw new Error(`${label}: expected FAULT, got ${state}`);
  }
  if (pattern && !pattern.test(String(result?.exception || ''))) {
    throw new Error(`${label}: unexpected exception ${result?.exception || ''}`);
  }
  return { state, exception: result?.exception || '' };
}

async function main() {
  const account = new wallet.Account(TEST_WIF);
  const rpcClient = new rpc.RPCClient(RPC_URL);
  const version = await withRpcRetry('rpc.getVersion', () => rpcClient.getVersion());
  const networkMagic = Number(version.protocol.network);
  const deploymentTag = process.env.AA_VALIDATION_DEPLOY_TAG || `validation-plugin-matrix-${validationRunId()}`;
  const results = {
    env: {
      rpc: RPC_URL,
      networkMagic,
      address: account.address,
      scriptHash: normalizeHash(account.scriptHash),
    },
    deployments: {},
    matrix: {},
  };

  console.log(JSON.stringify(results.env, null, 2));

  logSection('Deploy Contracts');
  const core = await deployContract(rpcClient, account, networkMagic, 'UnifiedSmartWalletV3', `${deploymentTag}-core`);
  const web3AuthA = await deployContract(rpcClient, account, networkMagic, 'Web3AuthVerifier', `${deploymentTag}-web3auth-a`);
  const web3AuthB = await deployContract(rpcClient, account, networkMagic, 'Web3AuthVerifier', `${deploymentTag}-web3auth-b`);
  const teeVerifier = await deployContract(rpcClient, account, networkMagic, 'TEEVerifier', `${deploymentTag}-tee`);
  const webAuthnVerifier = await deployContract(rpcClient, account, networkMagic, 'WebAuthnVerifier', `${deploymentTag}-webauthn`);
  const sessionKeyVerifier = await deployContract(rpcClient, account, networkMagic, 'SessionKeyVerifier', `${deploymentTag}-session-key`);
  const multiSigVerifier = await deployContract(rpcClient, account, networkMagic, 'MultiSigVerifier', `${deploymentTag}-multisig`);
  const subscriptionVerifier = await deployContract(rpcClient, account, networkMagic, 'SubscriptionVerifier', `${deploymentTag}-subscription`);
  const zkEmailVerifier = await deployContract(rpcClient, account, networkMagic, 'ZKEmailVerifier', `${deploymentTag}-zkemail`);
  const whitelistHook = await deployContract(rpcClient, account, networkMagic, 'WhitelistHook', `${deploymentTag}-whitelist`);
  const dailyLimitHook = await deployContract(rpcClient, account, networkMagic, 'DailyLimitHook', `${deploymentTag}-daily-limit`);
  const tokenRestrictedHook = await deployContract(rpcClient, account, networkMagic, 'TokenRestrictedHook', `${deploymentTag}-token-restricted`);
  const multiHook = await deployContract(rpcClient, account, networkMagic, 'MultiHook', `${deploymentTag}-multi-hook`);
  const neoDidHook = await deployContract(rpcClient, account, networkMagic, 'NeoDIDCredentialHook', `${deploymentTag}-neodid-hook`);
  const mockTarget = await deployContract(rpcClient, account, networkMagic, 'MockTransferTarget', `${deploymentTag}-mock-target`);

  Object.assign(results.deployments, {
    core,
    web3AuthA,
    web3AuthB,
    teeVerifier,
    webAuthnVerifier,
    sessionKeyVerifier,
    multiSigVerifier,
    subscriptionVerifier,
    zkEmailVerifier,
    whitelistHook,
    dailyLimitHook,
    tokenRestrictedHook,
    multiHook,
    neoDidHook,
    mockTarget,
  });
  console.log(JSON.stringify(results.deployments, null, 2));

  const aaClient = new AbstractAccountClient(RPC_URL, core.hash);

  async function registerAccount(label, options = {}) {
    const initialVerifier = normalizeHash(options.verifier || '0'.repeat(40));
    const initialVerifierParams = sanitizeHex(options.verifierParams || '');
    const initialHook = normalizeHash(options.hook || '0'.repeat(40));
    const accountId = randomAccountId();
    const virtual = aaClient.deriveVirtualAccount(accountId);
    const register = await invokePersisted(
      rpcClient,
      core.hash,
      account,
      networkMagic,
      'registerAccount',
      [
        hash160Param(accountId),
        hash160Param(sanitizeHex(initialVerifier || '0'.repeat(40))),
        initialVerifierParams ? byteArrayParam(initialVerifierParams) : emptyByteArrayParam(),
        hash160Param(sanitizeHex(initialHook || '0'.repeat(40))),
        hash160Param(account.scriptHash),
        integerParam(1),
      ],
    );
    return {
      label,
      accountId,
      virtualAddress: virtual.address,
      virtualScriptHash: virtual.scriptHash,
      registerTxid: register.txid,
    };
  }

  async function getNonce(accountId) {
    const stack = await readAndDecode(rpcClient, core.hash, 'getNonce', [hash160Param(accountId), integerParam(0)]);
    return BigInt(stack.value || '0');
  }

  async function computeArgsHash(args) {
    const stack = await readAndDecode(rpcClient, core.hash, 'computeArgsHash', [arrayParam(args)]);
    return Buffer.from(stack.value || '', 'base64').toString('hex');
  }

  async function directFault(contractHash, operation, params, pattern) {
    const result = await testInvoke(rpcClient, contractHash, account, networkMagic, operation, params, [makeSigner(account.scriptHash)]);
    return assertFaultResult(result, `${sanitizeHex(contractHash)}.${operation}`, pattern);
  }

  logSection('Direct Config Attack Surface');
  results.matrix.directConfigGuards = {
    whitelistDirectSet: await directFault(
      whitelistHook.hash,
      'setWhitelist',
      [hash160Param(randomAccountId()), hash160Param(mockTarget.hash), boolParam(true)],
      /(Unauthorized|not found|Called Contract Does Not Exist)/
    ),
    web3AuthDirectSet: await directFault(
      web3AuthA.hash,
      'setPublicKey',
      [hash160Param(randomAccountId()), byteArrayParam(sanitizeHex(ethers.Wallet.createRandom().signingKey.publicKey))],
      /(Unauthorized|not found|Called Contract Does Not Exist)/
    ),
  };
  console.log(JSON.stringify(results.matrix.directConfigGuards, null, 2));

  logSection('Web3Auth Verifier');
  {
    const scenario = await registerAccount('web3auth');
    const signer = ethers.Wallet.createRandom();
    const pubKey = sanitizeHex(signer.signingKey.publicKey);
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'updateVerifier', [
      hash160Param(scenario.accountId),
      hash160Param(web3AuthA.hash),
      byteArrayParam(pubKey),
    ]);

    const nonce = await getNonce(scenario.accountId);
    const argsHash = await computeArgsHash([]);
    const deadline = Date.now() + (60 * 60 * 1000);
    const typedData = buildV3UserOperationTypedData({
      chainId: networkMagic,
      verifyingContract: sanitizeHex(web3AuthA.hash),
      accountIdHash: scenario.accountId,
      targetContract: mockTarget.hash,
      method: 'symbol',
      argsHashHex: argsHash,
      nonce,
      deadline,
    });
    const signature = compactSignature(await signer.signTypedData(typedData.domain, typedData.types, typedData.message));
    const success = await invokePersisted(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({ targetContract: mockTarget.hash, method: 'symbol', args: [], nonce, deadline: BigInt(deadline), signatureHex: signature }),
    ]);

    const tampered = await testInvoke(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({ targetContract: mockTarget.hash, method: 'balanceOf', args: [hash160Param(account.scriptHash)], nonce: nonce + 1n, deadline: BigInt(deadline), signatureHex: signature }),
    ]);
    const replay = await testInvoke(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({ targetContract: mockTarget.hash, method: 'symbol', args: [], nonce, deadline: BigInt(deadline), signatureHex: signature }),
    ]);

    results.matrix.web3Auth = {
      accountId: normalizeHash(scenario.accountId),
      txid: success.txid,
      result: stackItemToText(success.execution.stack?.[0]),
      tampered: assertFaultResult(tampered, 'web3auth.tampered', /Verifier rejected signature/),
      replay: assertFaultResult(replay, 'web3auth.replay', /Invalid sequence for channel|Salt already used/),
    };
    console.log(JSON.stringify(results.matrix.web3Auth, null, 2));
  }

async function runP256VerifierScenario(name, verifierHash, verifierKeyHex = '') {
    const scenario = await registerAccount(name);
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'updateVerifier', [
      hash160Param(scenario.accountId),
      hash160Param(verifierHash),
      byteArrayParam(verifierKeyHex || account.publicKey),
    ]);
    const nonce = await getNonce(scenario.accountId);
    const deadline = Date.now() + (60 * 60 * 1000);
    const args = [];
    const payloadStack = await readAndDecode(rpcClient, verifierHash, 'getPayload', [
      hash160Param(scenario.accountId),
      hash160Param(mockTarget.hash),
      stringParam('symbol'),
      arrayParam(args),
      integerParam(nonce),
      integerParam(deadline),
    ]);
    const payload = Buffer.from(payloadStack.value || '', 'base64');
    const signature = wallet.sign(payload.toString('hex'), account.privateKey);
    const success = await invokePersisted(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({ targetContract: mockTarget.hash, method: 'symbol', args, nonce, deadline: BigInt(deadline), signatureHex: signature }),
    ]);
    const tampered = await testInvoke(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({ targetContract: mockTarget.hash, method: 'transfer', args: [], nonce: nonce + 1n, deadline: BigInt(deadline), signatureHex: signature }),
    ]);
    return {
      accountId: normalizeHash(scenario.accountId),
      txid: success.txid,
      result: stackItemToText(success.execution.stack?.[0]),
      tampered: assertFaultResult(tampered, `${name}.tampered`, /Verifier rejected signature|Method not permitted|Target contract not permitted|Invalid signature/),
      raw: scenario,
    };
  }

  logSection('TEE Verifier');
  {
    const tee = await runP256VerifierScenario('tee', teeVerifier.hash);
    results.matrix.teeVerifier = {
      accountId: tee.accountId,
      txid: tee.txid,
      result: tee.result,
      tampered: tee.tampered,
    };
    console.log(JSON.stringify(results.matrix.teeVerifier, null, 2));
  }

  logSection('WebAuthn Verifier');
  {
    const webauthn = await runP256VerifierScenario('webauthn', webAuthnVerifier.hash);
    results.matrix.webAuthnVerifier = {
      accountId: webauthn.accountId,
      txid: webauthn.txid,
      result: webauthn.result,
      tampered: webauthn.tampered,
    };
    console.log(JSON.stringify(results.matrix.webAuthnVerifier, null, 2));
  }

  logSection('Session Key Verifier');
  {
    const scenario = await registerAccount('session-key');
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'updateVerifier', [
      hash160Param(scenario.accountId),
      hash160Param(sessionKeyVerifier.hash),
      emptyByteArrayParam(),
    ]);
    const validUntil = 2_000_000_000_000n;
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'callVerifier', [
      hash160Param(scenario.accountId),
      stringParam('setSessionKey'),
      arrayParam([
        hash160Param(scenario.accountId),
        byteArrayParam(account.publicKey),
        hash160Param(mockTarget.hash),
        stringParam('symbol'),
        integerParam(validUntil),
      ]),
    ]);
    const nonce = await getNonce(scenario.accountId);
    const deadline = Date.now() + (60 * 60 * 1000);
    const payloadStack = await readAndDecode(rpcClient, sessionKeyVerifier.hash, 'getPayload', [
      hash160Param(scenario.accountId),
      hash160Param(mockTarget.hash),
      stringParam('symbol'),
      arrayParam([]),
      integerParam(nonce),
      integerParam(deadline),
    ]);
    const payload = Buffer.from(payloadStack.value || '', 'base64');
    const signature = wallet.sign(payload.toString('hex'), account.privateKey);
    const success = await invokePersisted(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({ targetContract: mockTarget.hash, method: 'symbol', args: [], nonce, deadline: BigInt(deadline), signatureHex: signature }),
    ]);

    const wrongTarget = await testInvoke(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({ targetContract: GAS_HASH, method: 'symbol', args: [], nonce: nonce + 1n, deadline: BigInt(deadline), signatureHex: signature }),
    ]);
    const expiredConfig = await testInvoke(rpcClient, core.hash, account, networkMagic, 'callVerifier', [
      hash160Param(scenario.accountId),
      stringParam('setSessionKey'),
      arrayParam([
        hash160Param(scenario.accountId),
        byteArrayParam(account.publicKey),
        hash160Param(mockTarget.hash),
        stringParam('symbol'),
        integerParam(1),
      ]),
    ], [makeSigner(account.scriptHash)]);

    results.matrix.sessionKeyVerifier = {
      accountId: normalizeHash(scenario.accountId),
      txid: success.txid,
      result: stackItemToText(success.execution.stack?.[0]),
      wrongTarget: assertFaultResult(wrongTarget, 'session.wrongTarget', /Target contract not permitted|Method not permitted/),
      expiredConfig: assertFaultResult(expiredConfig, 'session.expiredConfig', /Session key must expire in the future/),
    };
    console.log(JSON.stringify(results.matrix.sessionKeyVerifier, null, 2));
  }

  logSection('MultiSig Verifier');
  {
    const signerA = ethers.Wallet.createRandom();
    const scenario = await registerAccount('multisig', {
      verifier: web3AuthA.hash,
      verifierParams: sanitizeHex(signerA.signingKey.publicKey),
    });
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'initiateEscape', [
      hash160Param(scenario.accountId),
    ]);
    await sleep(3000);
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'finalizeEscape', [
      hash160Param(scenario.accountId),
      hash160Param(multiSigVerifier.hash),
    ]);
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'callVerifier', [
      hash160Param(scenario.accountId),
      stringParam('setConfig'),
      arrayParam([
        hash160Param(scenario.accountId),
        arrayParam([hash160Param(web3AuthA.hash), hash160Param(web3AuthA.hash)]),
        integerParam(2),
      ]),
    ]);

    const nonce = await getNonce(scenario.accountId);
    const argsHash = await computeArgsHash([]);
    const deadline = Date.now() + (60 * 60 * 1000);
    const typedDataA = buildV3UserOperationTypedData({
      chainId: networkMagic,
      verifyingContract: sanitizeHex(web3AuthA.hash),
      accountIdHash: scenario.accountId,
      targetContract: mockTarget.hash,
      method: 'symbol',
      argsHashHex: argsHash,
      nonce,
      deadline,
    });
    const sigA = compactSignature(await signerA.signTypedData(typedDataA.domain, typedDataA.types, typedDataA.message));
    const serializedGood = (await stdLibSerialize(rpcClient, arrayParam([byteArrayParam(sigA), byteArrayParam(sigA)]))).toString('hex');
    const success = await invokePersisted(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({ targetContract: mockTarget.hash, method: 'symbol', args: [], nonce, deadline: BigInt(deadline), signatureHex: serializedGood }),
    ]);

    const serializedBad = (await stdLibSerialize(rpcClient, arrayParam([byteArrayParam(sigA), byteArrayParam('11'.repeat(64))]))).toString('hex');
    const insufficient = await testInvoke(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({ targetContract: mockTarget.hash, method: 'symbol', args: [], nonce: nonce + 1n, deadline: BigInt(deadline), signatureHex: serializedBad }),
    ]);

    results.matrix.multiSigVerifier = {
      accountId: normalizeHash(scenario.accountId),
      txid: success.txid,
      result: stackItemToText(success.execution.stack?.[0]),
      insufficient: assertFaultResult(insufficient, 'multisig.insufficient', /Verifier rejected signature|Invalid signature/),
    };
    console.log(JSON.stringify(results.matrix.multiSigVerifier, null, 2));
  }

  logSection('Subscription Verifier');
  {
    const scenario = await registerAccount('subscription');
    const subId = Buffer.from(ethers.randomBytes(8)).toString('hex');
    const periodMs = 3600000n;
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'updateVerifier', [
      hash160Param(scenario.accountId),
      hash160Param(subscriptionVerifier.hash),
      emptyByteArrayParam(),
    ]);
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'callVerifier', [
      hash160Param(scenario.accountId),
      stringParam('createSubscription'),
      arrayParam([
        hash160Param(scenario.accountId),
        byteArrayParam(subId),
        hash160Param(account.scriptHash),
        hash160Param(mockTarget.hash),
        integerParam(100),
        integerParam(periodMs),
      ]),
    ]);

    const chainNowMs = await getLatestBlockTimeMs(rpcClient);
    const overAmount = await testInvoke(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({
        targetContract: mockTarget.hash,
        method: 'transfer',
        args: [hash160Param(scenario.virtualScriptHash), hash160Param(account.scriptHash), integerParam(101), stringParam('sub')],
        nonce: expectedSubscriptionNonce(subId, periodMs, chainNowMs),
        deadline: BigInt(chainNowMs + (60 * 60 * 1000)),
        signatureHex: subId,
      }),
    ]);

    const nowMs = await getLatestBlockTimeMs(rpcClient);
    const nonce = expectedSubscriptionNonce(subId, periodMs, nowMs);
    const success = await invokePersisted(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({
        targetContract: mockTarget.hash,
        method: 'transfer',
        args: [hash160Param(scenario.virtualScriptHash), hash160Param(account.scriptHash), integerParam(50), stringParam('sub')],
        nonce,
        deadline: BigInt(nowMs + (60 * 60 * 1000)),
        signatureHex: subId,
      }),
    ]);

    const replay = await testInvoke(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({
        targetContract: mockTarget.hash,
        method: 'transfer',
        args: [hash160Param(scenario.virtualScriptHash), hash160Param(account.scriptHash), integerParam(50), stringParam('sub')],
        nonce,
        deadline: BigInt(nowMs + (60 * 60 * 1000)),
        signatureHex: subId,
      }),
    ]);

    results.matrix.subscriptionVerifier = {
      accountId: normalizeHash(scenario.accountId),
      txid: success.txid,
      result: String(success.execution.stack?.[0]?.value ?? ''),
      overAmount: assertFaultResult(overAmount, 'subscription.overAmount', /Transfer amount exceeds subscription/),
      replay: assertFaultResult(replay, 'subscription.replay', /Salt already used/),
    };
    console.log(JSON.stringify(results.matrix.subscriptionVerifier, null, 2));
  }

  logSection('ZKEmail Verifier');
  {
    const scenario = await registerAccount('zkemail');
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'updateVerifier', [
      hash160Param(scenario.accountId),
      hash160Param(zkEmailVerifier.hash),
      emptyByteArrayParam(),
    ]);
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'callVerifier', [
      hash160Param(scenario.accountId),
      stringParam('setDKIMRegistry'),
      arrayParam([
        hash160Param(scenario.accountId),
        byteArrayParam('aa'),
      ]),
    ]);

    const disabled = await testInvoke(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({
        targetContract: mockTarget.hash,
        method: 'symbol',
        args: [],
        nonce: 0n,
        deadline: BigInt(Date.now() + (60 * 60 * 1000)),
        signatureHex: 'ff',
      }),
    ]);

    results.matrix.zkEmailVerifier = {
      accountId: normalizeHash(scenario.accountId),
      disabled: assertFaultResult(disabled, 'zkemail.disabled', /disabled pending real proof verification/),
    };
    console.log(JSON.stringify(results.matrix.zkEmailVerifier, null, 2));
  }

  logSection('Whitelist Hook');
  {
    const scenario = await registerAccount('whitelist-hook');
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'updateHook', [
      hash160Param(scenario.accountId),
      hash160Param(whitelistHook.hash),
    ]);
    const denied = await testInvoke(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({ targetContract: mockTarget.hash, method: 'symbol', args: [], nonce: 0n, deadline: BigInt(Date.now() + (60 * 60 * 1000)), signatureHex: '' }),
    ], [makeSigner(account.scriptHash)]);
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'callHook', [
      hash160Param(scenario.accountId),
      stringParam('setWhitelist'),
      arrayParam([hash160Param(scenario.accountId), hash160Param(mockTarget.hash), boolParam(true)]),
    ]);
    const success = await invokePersisted(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({ targetContract: mockTarget.hash, method: 'symbol', args: [], nonce: 0n, deadline: BigInt(Date.now() + (60 * 60 * 1000)), signatureHex: '' }),
    ]);
    results.matrix.whitelistHook = {
      accountId: normalizeHash(scenario.accountId),
      txid: success.txid,
      result: stackItemToText(success.execution.stack?.[0]),
      denied: assertFaultResult(denied, 'whitelist.denied', /Target contract not in whitelist/),
    };
    console.log(JSON.stringify(results.matrix.whitelistHook, null, 2));
  }

  logSection('Daily Limit Hook');
  {
    const scenario = await registerAccount('daily-limit');
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'updateHook', [
      hash160Param(scenario.accountId),
      hash160Param(dailyLimitHook.hash),
    ]);
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'callHook', [
      hash160Param(scenario.accountId),
      stringParam('setDailyLimit'),
      arrayParam([hash160Param(scenario.accountId), hash160Param(mockTarget.hash), integerParam(100)]),
    ]);
    const exec1 = await invokePersisted(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({
        targetContract: mockTarget.hash,
        method: 'transfer',
        args: [hash160Param(scenario.virtualScriptHash), hash160Param(account.scriptHash), integerParam(40), stringParam('one')],
        nonce: 0n,
        deadline: BigInt(Date.now() + (60 * 60 * 1000)),
        signatureHex: '',
      }),
    ]);
    const overflow = await testInvoke(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({
        targetContract: mockTarget.hash,
        method: 'transfer',
        args: [hash160Param(scenario.virtualScriptHash), hash160Param(account.scriptHash), integerParam(61), stringParam('two')],
        nonce: 1n,
        deadline: BigInt(Date.now() + (60 * 60 * 1000)),
        signatureHex: '',
      }),
    ], [makeSigner(account.scriptHash)]);
    results.matrix.dailyLimitHook = {
      accountId: normalizeHash(scenario.accountId),
      txid: exec1.txid,
      result: String(exec1.execution.stack?.[0]?.value ?? ''),
      overflow: assertFaultResult(overflow, 'daily.overflow', /Daily limit exceeded/),
    };
    console.log(JSON.stringify(results.matrix.dailyLimitHook, null, 2));
  }

  logSection('Token Restricted Hook');
  {
    const scenario = await registerAccount('token-restricted');
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'updateHook', [
      hash160Param(scenario.accountId),
      hash160Param(tokenRestrictedHook.hash),
    ]);
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'callHook', [
      hash160Param(scenario.accountId),
      stringParam('setRestrictedToken'),
      arrayParam([hash160Param(scenario.accountId), hash160Param(GAS_HASH), boolParam(true)]),
    ]);
    const success = await invokePersisted(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({ targetContract: mockTarget.hash, method: 'symbol', args: [], nonce: 0n, deadline: BigInt(Date.now() + (60 * 60 * 1000)), signatureHex: '' }),
    ]);
    const restricted = await testInvoke(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({ targetContract: GAS_HASH, method: 'symbol', args: [], nonce: 1n, deadline: BigInt(Date.now() + (60 * 60 * 1000)), signatureHex: '' }),
    ], [makeSigner(account.scriptHash)]);
    results.matrix.tokenRestrictedHook = {
      accountId: normalizeHash(scenario.accountId),
      txid: success.txid,
      result: stackItemToText(success.execution.stack?.[0]),
      restricted: assertFaultResult(restricted, 'restricted.denied', /Interaction with restricted token is forbidden/),
    };
    console.log(JSON.stringify(results.matrix.tokenRestrictedHook, null, 2));
  }

  logSection('MultiHook');
  {
    const scenario = await registerAccount('multihook', {
      hook: multiHook.hash,
    });
    const configured = await invokePersisted(rpcClient, core.hash, account, networkMagic, 'callHook', [
      hash160Param(scenario.accountId),
      stringParam('setHooks'),
      arrayParam([
        hash160Param(scenario.accountId),
        arrayParam([hash160Param(whitelistHook.hash), hash160Param(tokenRestrictedHook.hash)]),
      ]),
    ]);
    const storedHooks = await readAndDecode(rpcClient, multiHook.hash, 'getHooks', [hash160Param(scenario.accountId)]);
    const blocked = await testInvoke(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({ targetContract: mockTarget.hash, method: 'symbol', args: [], nonce: 0n, deadline: BigInt(Date.now() + (60 * 60 * 1000)), signatureHex: '' }),
    ], [makeSigner(account.scriptHash)]);
    results.matrix.multiHook = {
      accountId: normalizeHash(scenario.accountId),
      txid: configured.txid,
      hookCount: Array.isArray(storedHooks?.value) ? storedHooks.value.length : 0,
      blocked: assertFaultResult(blocked, 'multihook.blocked', /Target contract not in whitelist|Interaction with restricted token is forbidden/),
    };
    console.log(JSON.stringify(results.matrix.multiHook, null, 2));
  }

  logSection('NeoDID Credential Hook');
  {
    const scenario = await registerAccount('neodid-hook');
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'updateHook', [
      hash160Param(scenario.accountId),
      hash160Param(neoDidHook.hash),
    ]);
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'callHook', [
      hash160Param(scenario.accountId),
      stringParam('requireCredentialForContract'),
      arrayParam([hash160Param(scenario.accountId), hash160Param(mockTarget.hash), stringParam('KYC_BASIC')]),
    ]);
    const missing = await testInvoke(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({ targetContract: mockTarget.hash, method: 'symbol', args: [], nonce: 0n, deadline: BigInt(Date.now() + (60 * 60 * 1000)), signatureHex: '' }),
    ], [makeSigner(account.scriptHash)]);
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'callHook', [
      hash160Param(scenario.accountId),
      stringParam('issueCredential'),
      arrayParam([hash160Param(scenario.accountId), stringParam('KYC_BASIC')]),
    ]);
    const success = await invokePersisted(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({ targetContract: mockTarget.hash, method: 'symbol', args: [], nonce: 0n, deadline: BigInt(Date.now() + (60 * 60 * 1000)), signatureHex: '' }),
    ]);
    await invokePersisted(rpcClient, core.hash, account, networkMagic, 'callHook', [
      hash160Param(scenario.accountId),
      stringParam('revokeCredential'),
      arrayParam([hash160Param(scenario.accountId), stringParam('KYC_BASIC')]),
    ]);
    const revoked = await testInvoke(rpcClient, core.hash, account, networkMagic, 'executeUserOp', [
      hash160Param(scenario.accountId),
      userOpParam({ targetContract: mockTarget.hash, method: 'symbol', args: [], nonce: 1n, deadline: BigInt(Date.now() + (60 * 60 * 1000)), signatureHex: '' }),
    ], [makeSigner(account.scriptHash)]);
    results.matrix.neoDidCredentialHook = {
      accountId: normalizeHash(scenario.accountId),
      txid: success.txid,
      result: stackItemToText(success.execution.stack?.[0]),
      missing: assertFaultResult(missing, 'neodid.missing', /NeoDID Credential Missing/),
      revoked: assertFaultResult(revoked, 'neodid.revoked', /NeoDID Credential Missing/),
    };
    console.log(JSON.stringify(results.matrix.neoDidCredentialHook, null, 2));
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const reportPath = path.join(REPORT_DIR, `2026-03-13-v3-testnet-plugin-matrix.${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  logSection('Report');
  console.log(reportPath);
  console.log(JSON.stringify({
    reportPath,
    core: core.hash,
    mockTarget: mockTarget.hash,
    scenarios: Object.keys(results.matrix),
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
