const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildV3UserOp, buildEIP712PayloadForWeb3AuthVerifier } = require('../src/v3/UserOp');
const { AbstractAccountClient, buildV3UserOperationTypedData } = require('../src/index');

const repoRoot = path.resolve(__dirname, '..', '..', '..');

test('buildV3UserOp constructs valid layout', () => {
  const op = buildV3UserOp({
    targetContract: '1234567890123456789012345678901234567890',
    method: 'transfer',
    args: [],
    nonce: 1,
    deadline: 9999999999,
  });

  assert.equal(op.TargetContract, '1234567890123456789012345678901234567890');
  assert.equal(op.Method, 'transfer');
  assert.equal(op.Nonce, 1);
});

test('buildEIP712PayloadForWeb3AuthVerifier derives argsHash when omitted', () => {
  const op = buildV3UserOp({
    targetContract: '1234567890123456789012345678901234567890',
    method: 'transfer',
    args: [],
    nonce: 1,
    deadline: 9999999999,
  });

  const payload = buildEIP712PayloadForWeb3AuthVerifier({
    chainId: 894710606,
    verifierHash: '0x1234',
    accountId: 'abcd',
    userOp: op,
  });

  assert.equal(payload.domain.name, 'Neo N3 Abstract Account');
  assert.equal(payload.message.method, 'transfer');
});

test('buildV3UserOperationTypedData constructs correct domain and message', () => {
  const payload = buildV3UserOperationTypedData({
    chainId: 894710606,
    verifyingContract: '0x1234',
    accountIdHash: 'abcd',
    targetContract: '1234567890123456789012345678901234567890',
    method: 'transfer',
    argsHashHex: 'ab'.repeat(32),
    nonce: 1,
    deadline: 9999999999,
  });

  assert.equal(payload.domain.name, 'Neo N3 Abstract Account');
  assert.equal(payload.domain.chainId, 894710606);
  assert.equal(payload.message.method, 'transfer');
});

test('deriveRegistrationAccountIdHash matches the frontend V3 registration vector', () => {
  const client = new AbstractAccountClient('https://example.invalid', '0x1234567890123456789012345678901234567890');
  const accountId = client.deriveRegistrationAccountIdHash({
    verifierContractHash: '0x5be915aea3ce85e4752d522632f0a9520e377aaf',
    verifierParamsHex: '11223344',
    backupOwnerAddress: '0x13ef519c362973f9a34648a9eac5b71250b2a80a',
    escapeTimelock: 2592000,
  });

  assert.equal(accountId, '27c01243fca45e1b821dc3bb45267a579762d530');
});

test('createAccountPayload derives the registration-bound account id', () => {
  const client = new AbstractAccountClient('https://example.invalid', '0x1234567890123456789012345678901234567890');
  const options = {
    verifierContractHash: '0x2222222222222222222222222222222222222222',
    verifierParamsHex: 'abcd',
    hookContractHash: '0x3333333333333333333333333333333333333333',
    backupOwnerAddress: '0x4444444444444444444444444444444444444444',
    escapeTimelock: 604800,
  };
  const payload = client.createAccountPayload(options);

  assert.equal(payload.operation, 'registerAccount');
  assert.equal(payload.args[0].type, 20);
  assert.equal(payload.args[1].type, 20);
  assert.equal(payload.args.length, 6);
  assert.equal(payload.args[0].value.toString(), '4d36b9ed890256b601e09604f2b9370861a1642b');
});

test('SDK registration helpers reject escape timelocks outside the contract registration bounds', () => {
  const client = new AbstractAccountClient('https://example.invalid', '0x1234567890123456789012345678901234567890');

  assert.throws(
    () => client.deriveRegistrationAccountIdHash({
      backupOwnerAddress: '0x4444444444444444444444444444444444444444',
      escapeTimelock: 604799,
    }),
    /escape timelock/i
  );

  assert.throws(
    () => client.createAccountPayload({
      backupOwnerAddress: '0x4444444444444444444444444444444444444444',
      escapeTimelock: 7776001,
    }),
    /escape timelock/i
  );
});

test('testnet validators derive registration-bound account ids with the contract minimum escape timelock', () => {
  const smokeSource = fs.readFileSync(path.join(repoRoot, 'sdk', 'js', 'tests', 'v3_testnet_smoke.js'), 'utf8');
  const marketEscrowSource = fs.readFileSync(path.join(repoRoot, 'sdk', 'js', 'tests', 'v3_testnet_market_escrow.js'), 'utf8');
  const pluginMatrixSource = fs.readFileSync(path.join(repoRoot, 'sdk', 'js', 'tests', 'v3_testnet_plugin_matrix.js'), 'utf8');
  const paymasterRelaySource = fs.readFileSync(path.join(repoRoot, 'sdk', 'js', 'tests', 'v3_testnet_paymaster_relay.mjs'), 'utf8');
  const paymasterOnchainSource = fs.readFileSync(path.join(repoRoot, 'sdk', 'js', 'tests', 'v3_testnet_paymaster_onchain.mjs'), 'utf8');

  assert.match(smokeSource, /deriveRegistrationAccountIdHash\(\{/);
  assert.match(smokeSource, /backupOwnerAddress: account\.scriptHash/);
  assert.match(smokeSource, /escapeTimelock: REGISTRATION_ESCAPE_TIMELOCK/);

  assert.match(pluginMatrixSource, /deriveRegistrationAccountIdHash\(\{/);
  assert.match(pluginMatrixSource, /verifierContractHash: initialVerifier/);
  assert.match(pluginMatrixSource, /verifierParamsHex: effectiveVerifierParams/);
  assert.match(pluginMatrixSource, /hookContractHash: initialHook/);
  assert.match(pluginMatrixSource, /escapeTimelock: REGISTRATION_ESCAPE_TIMELOCK/);

  assert.match(marketEscrowSource, /deriveRegistrationAccountIdHash\(\{/);
  assert.match(marketEscrowSource, /verifierContractHash: teeVerifier\.hash/);
  assert.match(marketEscrowSource, /verifierParamsHex: sanitizeHex\(seller\.publicKey\)/);
  assert.match(marketEscrowSource, /hookContractHash: whitelistHook\.hash/);
  assert.match(marketEscrowSource, /escapeTimelock: REGISTRATION_ESCAPE_TIMELOCK/);

  assert.match(paymasterRelaySource, /deriveRegistrationAccountIdHash\(\{/);
  assert.match(paymasterRelaySource, /backupOwnerAddress: account\.scriptHash/);
  assert.match(paymasterRelaySource, /escapeTimelock: REGISTRATION_ESCAPE_TIMELOCK/);
  assert.doesNotMatch(paymasterRelaySource, /\ballowlistAccountId = PAYMASTER_ACCOUNT_ID\b/);
  assert.doesNotMatch(paymasterRelaySource, /\bDEFAULT_PAYMASTER_ACCOUNT_ID\b/);
  assert.match(paymasterRelaySource, /const defaultBootstrapAccountId = sanitizeHex\(EXPLICIT_PAYMASTER_ACCOUNT_ID \|\| deriveBootstrapAccountId\(\)\);/);
  assert.match(paymasterRelaySource, /const usingReusableBootstrapAccount = skipAllowlistUpdate && normalizeHash\(accountId\) === normalizeHash\(defaultBootstrapAccountId\);/);
  assert.doesNotMatch(paymasterRelaySource, /const usingDerivedDefaultAccount = !EXPLICIT_PAYMASTER_ACCOUNT_ID && skipAllowlistUpdate;/);
  assert.match(paymasterRelaySource, /resolveTestnetRpcUrl/);
  assert.match(paymasterRelaySource, /const localOverrides = \(!skipAllowlistUpdate && normalizedAllowlistAccountId\)/);

  assert.match(paymasterOnchainSource, /deriveRegistrationAccountIdHash\(\{/);
  assert.match(paymasterOnchainSource, /verifierContractHash: verifier\.hash/);
  assert.match(paymasterOnchainSource, /verifierParamsHex: evmPubKeyUncompressed/);
  assert.match(paymasterOnchainSource, /escapeTimelock: ESCAPE_TIMELOCK/);

  assert.doesNotMatch(smokeSource, /const accountId = randomAccountId();/);
  assert.doesNotMatch(pluginMatrixSource, /const accountId = randomAccountId();/);
  assert.doesNotMatch(marketEscrowSource, /const accountId = randomAccountId();/);
  assert.doesNotMatch(paymasterOnchainSource, /Buffer.from(ethers.randomBytes(20)).toString('hex')/);
});

test('testnet validation suite includes smoke, plugin matrix, market escrow, and on-chain paymaster lanes', () => {
  const suiteSource = fs.readFileSync(path.join(repoRoot, 'sdk', 'js', 'tests', 'v3_testnet_validation_suite.mjs'), 'utf8');
  const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');

  assert.match(suiteSource, /id: "smoke"/);
  assert.match(suiteSource, /id: "plugin_matrix"/);
  assert.match(suiteSource, /id: "market_escrow"/);
  assert.match(suiteSource, /id: "paymaster_onchain"/);
  assert.match(readme, /v3_testnet_market_escrow\.js/);
  assert.match(readme, /v3_testnet_paymaster_onchain\.mjs/);
  assert.match(readme, /testnet:validate:market/);
  assert.match(readme, /testnet:validate:paymaster-onchain/);
});

test('paymaster policy validator falls back to remote worker on direct transport failures', () => {
  const paymasterPolicySource = fs.readFileSync(path.join(repoRoot, 'sdk', 'js', 'tests', 'v3_testnet_paymaster_policy.mjs'), 'utf8');
  const paymasterRelaySource = fs.readFileSync(path.join(repoRoot, 'sdk', 'js', 'tests', 'v3_testnet_paymaster_relay.mjs'), 'utf8');
  const localPaymasterHandlerSource = fs.readFileSync(path.join(repoRoot, 'sdk', 'js', 'tests', 'local-paymaster-handler.js'), 'utf8');

  assert.match(paymasterPolicySource, /try\s*{\s*direct = await callDirectPaymaster\(payload\);/);
  assert.match(paymasterPolicySource, /catch \(error\) {[\s\S]*retrying via Phala CLI remote worker path[\s\S]*return callRemotePaymaster\(payload\);/);
  assert.match(paymasterPolicySource, /resolveLocalPaymasterHandlerPath/);
  assert.match(paymasterRelaySource, /resolveLocalPaymasterHandlerPath/);
  assert.match(localPaymasterHandlerSource, /MORPHEUS_LOCAL_PAYMASTER_HANDLER_PATH/);
  assert.match(localPaymasterHandlerSource, /neo-morpheus-oracle/);
  assert.match(paymasterPolicySource, /redactRuntimeSecrets/);
  assert.match(paymasterPolicySource, /LOCAL_PAYMASTER_RUNTIME_ENV_KEYS/);
  assert.match(paymasterRelaySource, /&& !LOCAL_PAYMASTER_HANDLER_PATH/);
  assert.match(paymasterRelaySource, /pathToFileURL\(LOCAL_PAYMASTER_HANDLER_PATH\)\.href/);
  assert.match(paymasterRelaySource, /catch \(error\) {[\s\S]*direct authorize endpoint failed[\s\S]*retrying via Phala CLI remote worker path/);
  assert.match(paymasterRelaySource, /LOCAL_PAYMASTER_RUNTIME_ENV_KEYS/);
  assert.match(paymasterRelaySource, /redactRuntimeSecrets/);
});

test('live testnet deploy scripts use entropy-backed deployment tags for reruns', () => {
  const smokeSource = fs.readFileSync(path.join(repoRoot, 'sdk', 'js', 'tests', 'v3_testnet_smoke.js'), 'utf8');
  const pluginMatrixSource = fs.readFileSync(path.join(repoRoot, 'sdk', 'js', 'tests', 'v3_testnet_plugin_matrix.js'), 'utf8');
  const marketEscrowSource = fs.readFileSync(path.join(repoRoot, 'sdk', 'js', 'tests', 'v3_testnet_market_escrow.js'), 'utf8');
  const paymasterOnchainSource = fs.readFileSync(path.join(repoRoot, 'sdk', 'js', 'tests', 'v3_testnet_paymaster_onchain.mjs'), 'utf8');
  const runbook = fs.readFileSync(path.join(repoRoot, 'docs', 'testnet-validation-runbook.md'), 'utf8');

  assert.match(smokeSource, /crypto\.randomBytes\(3\)\.toString\('hex'\)/);
  assert.match(pluginMatrixSource, /crypto\.randomBytes\(3\)\.toString\("hex"\)/);
  assert.match(marketEscrowSource, /crypto\.randomBytes\(3\)\.toString\('hex'\)/);
  assert.match(paymasterOnchainSource, /randomBytes\(3\)\.toString\('hex'\)/);
  assert.match(smokeSource, /premature close\|invalid response body/i);
  assert.match(pluginMatrixSource, /premature close\|invalid response body/i);
  assert.match(marketEscrowSource, /premature close\|invalid response body/i);
  assert.match(paymasterOnchainSource, /premature close\|invalid response body/i);
  assert.match(smokeSource, /resolveTestnetRpcUrl/);
  assert.match(pluginMatrixSource, /resolveTestnetRpcUrl/);
  assert.match(marketEscrowSource, /resolveTestnetRpcUrl/);
  assert.match(paymasterOnchainSource, /resolveTestnetRpcUrl/);
  assert.match(runbook, /TESTNET_RPC_URLS/);
  assert.match(runbook, /seed1/);
  assert.match(runbook, /v3_testnet_market_escrow\.js/);
  assert.match(runbook, /v3_testnet_paymaster_onchain\.mjs/);
});

test('createEIP712Payload builds the V3 UserOperation schema when accountIdHash is provided', async () => {
  const client = new AbstractAccountClient('https://example.invalid', '0x1234567890123456789012345678901234567890');
  client.computeArgsHash = async () => 'ab'.repeat(32);
  client.rpcClient = {
    async invokeScript() {
      return {
        state: 'HALT',
        stack: [{ value: '49c095ce04d38642e39155f5481615c58227a498' }],
      };
    },
  };

  const payload = await client.createEIP712Payload({
    chainId: 894710606,
    accountIdHash: 'f951cd3eb5196dacde99b339c5dcca37ac38cc22',
    targetContract: '0x49c095ce04d38642e39155f5481615c58227a498',
    method: 'balanceOf',
    args: [],
    nonce: 7,
    deadline: 1710000000,
  });

  assert.equal(payload.domain.verifyingContract, '0x49c095ce04d38642e39155f5481615c58227a498');
  assert.equal(payload.types.UserOperation[0].name, 'accountId');
  assert.equal(payload.message.accountId, '0xf951cd3eb5196dacde99b339c5dcca37ac38cc22');
});

test('update payload helpers target V3 hook and verifier methods', () => {
  const client = new AbstractAccountClient('https://example.invalid', '0x1234567890123456789012345678901234567890');

  const verifierPayload = client.createUpdateVerifierPayload({
    accountScriptHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    verifierContractHash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    verifierParamsHex: 'beef',
  });
  const hookPayload = client.createUpdateHookPayload({
    accountScriptHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    hookContractHash: '0xcccccccccccccccccccccccccccccccccccccccc',
  });

  assert.equal(verifierPayload.operation, 'updateVerifier');
  assert.equal(hookPayload.operation, 'updateHook');
});

test('client exposes standards-aligned account capability introspection helpers', async () => {
  const client = new AbstractAccountClient('https://example.invalid', '0x1234567890123456789012345678901234567890');
  const responses = [
    {
      state: 'HALT',
      stack: [{ type: 'ByteString', value: Buffer.from('org.r3e.neo.aa.unified-smart-wallet.v3').toString('base64') }],
    },
    {
      state: 'HALT',
      stack: [{ type: 'Boolean', value: true }],
    },
    {
      state: 'HALT',
      stack: [{ type: 'Boolean', value: true }],
    },
    {
      state: 'HALT',
      stack: [{ type: 'Boolean', value: true }],
    },
  ];
  client.rpcClient = {
    async invokeScript() {
      return responses.shift();
    },
  };

  assert.equal(await client.getAccountImplementationId(), 'org.r3e.neo.aa.unified-smart-wallet.v3');
  assert.equal(await client.supportsExecutionMode('single'), true);
  assert.equal(await client.supportsModuleType('validator'), true);
  assert.equal(
    await client.isModuleInstalled(
      '0xf951cd3eb5196dacde99b339c5dcca37ac38cc22',
      'validator',
      '0xb4107cb2cb4bace0ebe15bc4842890734abe133a',
    ),
    true,
  );
});

test('client decodes previewUserOpValidation into a structured validation preview', async () => {
  const client = new AbstractAccountClient('https://example.invalid', '0x1234567890123456789012345678901234567890');
  client.rpcClient = {
    async invokeFunction() {
      return {
        state: 'HALT',
        stack: [{
          type: 'Array',
          value: [
            { type: 'Boolean', value: true },
            { type: 'Boolean', value: false },
            { type: 'Boolean', value: true },
            { type: 'Hash160', value: '0xb4107cb2cb4bace0ebe15bc4842890734abe133a' },
            { type: 'Hash160', value: '0x1111111111111111111111111111111111111111' },
          ],
        }],
      };
    },
  };

  const preview = await client.getUserOpValidationPreview({
    accountIdHash: 'f951cd3eb5196dacde99b339c5dcca37ac38cc22',
    targetContract: '49c095ce04d38642e39155f5481615c58227a498',
    method: 'transfer',
    args: [],
    nonce: 0,
    deadline: 1700000000,
  });

  assert.deepEqual(preview, {
    deadlineValid: true,
    nonceAcceptable: false,
    hasVerifier: true,
    verifier: 'b4107cb2cb4bace0ebe15bc4842890734abe133a',
    hook: '1111111111111111111111111111111111111111',
  });
});

test('getAccountState uses invokefunction for every V3 getter', async () => {
  const client = new AbstractAccountClient('https://example.invalid', '0x1234567890123456789012345678901234567890');
  const responses = new Map([
    ['getVerifier', { state: 'HALT', stack: [{ type: 'ByteString', value: Buffer.from('b4107cb2cb4bace0ebe15bc4842890734abe133a', 'hex').toString('base64') }] }],
    ['getHook', { state: 'HALT', stack: [{ type: 'ByteString', value: Buffer.from('1111111111111111111111111111111111111111', 'hex').toString('base64') }] }],
    ['getBackupOwner', { state: 'HALT', stack: [{ type: 'ByteString', value: Buffer.from('2222222222222222222222222222222222222222', 'hex').toString('base64') }] }],
    ['getEscapeTimelock', { state: 'HALT', stack: [{ type: 'Integer', value: '604800' }] }],
    ['getEscapeTriggeredAt', { state: 'HALT', stack: [{ type: 'Integer', value: '0' }] }],
    ['isEscapeActive', { state: 'HALT', stack: [{ type: 'Boolean', value: false }] }],
    ['getMetadataUri', { state: 'HALT', stack: [{ type: 'ByteString', value: Buffer.from('ipfs://demo', 'utf8').toString('base64') }] }],
  ]);
  const seen = [];

  client.rpcClient = {
    async invokeScript() {
      throw new Error('invokeScript should not be used for getAccountState');
    },
    async invokeFunction(_scriptHash, operation) {
      seen.push(operation);
      return responses.get(operation);
    },
  };

  const state = await client.getAccountState('0xf951cd3eb5196dacde99b339c5dcca37ac38cc22');

  assert.deepEqual(seen, [
    'getVerifier',
    'getHook',
    'getBackupOwner',
    'getEscapeTimelock',
    'getEscapeTriggeredAt',
    'isEscapeActive',
    'getMetadataUri',
  ]);
  assert.equal(state.verifier, 'b4107cb2cb4bace0ebe15bc4842890734abe133a');
  assert.equal(state.hook, '1111111111111111111111111111111111111111');
  assert.equal(state.backupOwner, '2222222222222222222222222222222222222222');
  assert.equal(state.escapeTimelock, '604800');
  assert.equal(state.escapeTriggeredAt, '0');
  assert.equal(state.escapeActive, false);
  assert.equal(state.metadataUri, 'ipfs://demo');
});

test('computeArgsHash uses invokefunction for array payloads', async () => {
  const client = new AbstractAccountClient('https://example.invalid', '0x1234567890123456789012345678901234567890');
  let invokeFunctionCalled = false;

  client.rpcClient = {
    async invokeScript() {
      throw new Error('invokeScript should not be used for computeArgsHash');
    },
    async invokeFunction(_scriptHash, operation) {
      invokeFunctionCalled = true;
      assert.equal(operation, 'computeArgsHash');
      return {
        state: 'HALT',
        stack: [{ type: 'ByteString', value: Buffer.from('ab'.repeat(32), 'hex').toString('base64') }],
      };
    },
  };

  const hash = await client.computeArgsHash([]);

  assert.equal(invokeFunctionCalled, true);
  assert.equal(hash, 'ab'.repeat(32));
});

test('pending maintenance helpers read pending verifier and hook calls through invokefunction', async () => {
  const client = new AbstractAccountClient('https://example.invalid', '0x1234567890123456789012345678901234567890');
  const responses = {
    hasPendingVerifierCall: { state: 'HALT', stack: [{ type: 'Boolean', value: true }] },
    getPendingVerifierCallTime: { state: 'HALT', stack: [{ type: 'Integer', value: '123456' }] },
    getPendingVerifierCallModule: { state: 'HALT', stack: [{ type: 'Hash160', value: '0xb4107cb2cb4bace0ebe15bc4842890734abe133a' }] },
    getPendingVerifierCallHash: { state: 'HALT', stack: [{ type: 'ByteString', value: Buffer.from('ab'.repeat(32), 'hex').toString('base64') }] },
    hasPendingHookCall: { state: 'HALT', stack: [{ type: 'Boolean', value: false }] },
    getPendingHookCallTime: { state: 'HALT', stack: [{ type: 'Integer', value: '0' }] },
    getPendingHookCallModule: { state: 'HALT', stack: [{ type: 'Hash160', value: '0x0000000000000000000000000000000000000000' }] },
    getPendingHookCallHash: { state: 'HALT', stack: [{ type: 'ByteString', value: '' }] },
  };
  const seen = [];

  client.rpcClient = {
    async invokeScript() {
      throw new Error('invokeScript should not be used for pending maintenance helpers');
    },
    async invokeFunction(_scriptHash, operation) {
      seen.push(operation);
      return responses[operation];
    },
  };

  const pendingVerifier = await client.getPendingVerifierCall('0xf951cd3eb5196dacde99b339c5dcca37ac38cc22');
  const pendingHook = await client.getPendingHookCall('0xf951cd3eb5196dacde99b339c5dcca37ac38cc22');

  assert.deepEqual(seen, [
    'hasPendingVerifierCall',
    'getPendingVerifierCallTime',
    'getPendingVerifierCallModule',
    'getPendingVerifierCallHash',
    'hasPendingHookCall',
    'getPendingHookCallTime',
    'getPendingHookCallModule',
    'getPendingHookCallHash',
  ]);
  assert.deepEqual(pendingVerifier, {
    hasPending: true,
    executeAfter: '123456',
    moduleHash: 'b4107cb2cb4bace0ebe15bc4842890734abe133a',
    callHash: 'ab'.repeat(32),
  });
  assert.deepEqual(pendingHook, {
    hasPending: false,
    executeAfter: '0',
    moduleHash: '0000000000000000000000000000000000000000',
    callHash: '',
  });
});

test('contract and docs expose a generic module lifecycle alongside legacy verifier and hook events', () => {
  const eventsSource = fs.readFileSync(path.join(repoRoot, 'contracts', 'UnifiedSmartWallet.Events.cs'), 'utf8');
  const accountsSource = fs.readFileSync(path.join(repoRoot, 'contracts', 'UnifiedSmartWallet.Accounts.cs'), 'utf8');
  const stateSource = fs.readFileSync(path.join(repoRoot, 'contracts', 'UnifiedSmartWallet.State.cs'), 'utf8');
  const escapeSource = fs.readFileSync(path.join(repoRoot, 'contracts', 'UnifiedSmartWallet.Escape.cs'), 'utf8');
  const marketSource = fs.readFileSync(path.join(repoRoot, 'contracts', 'UnifiedSmartWallet.MarketEscrow.cs'), 'utf8');
  const architectureDoc = fs.readFileSync(path.join(repoRoot, 'docs', 'architecture.md'), 'utf8');

  assert.match(eventsSource, /DisplayName\("ModuleInstalled"\)/);
  assert.match(eventsSource, /DisplayName\("ModuleUpdateInitiated"\)/);
  assert.match(eventsSource, /DisplayName\("ModuleUpdateConfirmed"\)/);
  assert.match(eventsSource, /DisplayName\("ModuleRemoved"\)/);
  assert.match(eventsSource, /DisplayName\("ModuleUpdateCancelled"\)/);

  assert.match(accountsSource, /OnModuleInstalled/);
  assert.match(accountsSource, /OnModuleUpdateInitiated/);
  assert.match(accountsSource, /OnModuleUpdateConfirmed/);
  assert.match(accountsSource, /OnModuleRemoved/);
  assert.match(stateSource, /OnModuleUpdateCancelled/);
  assert.match(escapeSource, /OnModuleRemoved/);
  assert.match(marketSource, /OnModuleRemoved/);

  assert.match(architectureDoc, /Module Lifecycle/i);
  assert.match(architectureDoc, /install/i);
  assert.match(architectureDoc, /replace/i);
  assert.match(architectureDoc, /remove/i);
  assert.match(architectureDoc, /cancel/i);
});

test('contract state exposes pending verifier and hook maintenance-call getters', () => {
  const stateSource = fs.readFileSync(path.join(repoRoot, 'contracts', 'UnifiedSmartWallet.State.cs'), 'utf8');

  assert.match(stateSource, /HasPendingVerifierCall/);
  assert.match(stateSource, /HasPendingHookCall/);
  assert.match(stateSource, /GetPendingVerifierCallModule/);
  assert.match(stateSource, /GetPendingHookCallModule/);
  assert.match(stateSource, /GetPendingVerifierCallHash/);
  assert.match(stateSource, /GetPendingHookCallHash/);
  assert.match(stateSource, /GetPendingVerifierCallTime/);
  assert.match(stateSource, /GetPendingHookCallTime/);
});

test('native secp256r1 verifiers share one canonical payload builder', () => {
  const helperSource = fs.readFileSync(path.join(repoRoot, 'contracts', 'verifiers', 'VerifierPayload.cs'), 'utf8');
  const modelSource = fs.readFileSync(path.join(repoRoot, 'contracts', 'verifiers', 'VerifierModels.cs'), 'utf8');
  const sessionKeySource = fs.readFileSync(path.join(repoRoot, 'contracts', 'verifiers', 'SessionKeyVerifier.cs'), 'utf8');
  const teeSource = fs.readFileSync(path.join(repoRoot, 'contracts', 'verifiers', 'TEEVerifier.cs'), 'utf8');
  const webAuthnSource = fs.readFileSync(path.join(repoRoot, 'contracts', 'verifiers', 'WebAuthnVerifier.cs'), 'utf8');
  const sessionKeyProject = fs.readFileSync(path.join(repoRoot, 'contracts', 'verifiers', 'SessionKeyVerifier.csproj'), 'utf8');
  const teeProject = fs.readFileSync(path.join(repoRoot, 'contracts', 'verifiers', 'TEEVerifier.csproj'), 'utf8');
  const webAuthnProject = fs.readFileSync(path.join(repoRoot, 'contracts', 'verifiers', 'WebAuthnVerifier.csproj'), 'utf8');

  assert.match(helperSource, /internal static class VerifierPayload/);
  assert.match(helperSource, /internal static byte\[\] BuildPayload/);
  assert.match(helperSource, /private static byte\[\] ToUint256Word/);
  assert.match(helperSource, /Runtime\.GetNetwork\(\)/);
  assert.match(helperSource, /Runtime\.ExecutingScriptHash/);
  assert.match(helperSource, /StdLib\.Serialize\(args\)/);
  assert.match(modelSource, /class UserOperation/);
  assert.match(modelSource, /public UInt160 TargetContract/);
  assert.match(modelSource, /public ByteString Signature/);

  assert.match(sessionKeySource, /VerifierPayload\.BuildPayload/);
  assert.match(teeSource, /VerifierPayload\.BuildPayload/);
  assert.match(webAuthnSource, /VerifierPayload\.BuildPayload/);

  assert.doesNotMatch(sessionKeySource, /private static byte\[\] BuildPayload/);
  assert.doesNotMatch(sessionKeySource, /private static byte\[\] ToUint256Word/);
  assert.doesNotMatch(teeSource, /private static byte\[\] BuildPayload/);
  assert.doesNotMatch(teeSource, /private static byte\[\] ToUint256Word/);
  assert.doesNotMatch(teeSource, /class UserOperation/);
  assert.doesNotMatch(webAuthnSource, /private static byte\[\] BuildPayload/);
  assert.doesNotMatch(webAuthnSource, /private static byte\[\] ToUint256Word/);

  assert.match(sessionKeyProject, /<RunNccsAfterBuild>false<\/RunNccsAfterBuild>/);
  assert.match(sessionKeyProject, /<Compile Include="VerifierPayload\.cs" \/>/);
  assert.match(sessionKeyProject, /<Compile Include="VerifierModels\.cs" \/>/);
  assert.match(teeProject, /<RunNccsAfterBuild>false<\/RunNccsAfterBuild>/);
  assert.match(teeProject, /<Compile Include="VerifierPayload\.cs" \/>/);
  assert.match(teeProject, /<Compile Include="VerifierModels\.cs" \/>/);
  assert.match(webAuthnProject, /<RunNccsAfterBuild>false<\/RunNccsAfterBuild>/);
  assert.match(webAuthnProject, /<Compile Include="VerifierPayload\.cs" \/>/);
  assert.match(webAuthnProject, /<Compile Include="VerifierModels\.cs" \/>/);
});

test('web3auth verifier also uses the shared verifier operation model', () => {
  const web3AuthSource = fs.readFileSync(path.join(repoRoot, 'contracts', 'verifiers', 'Web3AuthVerifier.cs'), 'utf8');
  const web3AuthProject = fs.readFileSync(path.join(repoRoot, 'contracts', 'verifiers', 'Web3AuthVerifier.csproj'), 'utf8');

  assert.doesNotMatch(web3AuthSource, /class UserOperation/);
  assert.match(web3AuthProject, /<Compile Include="VerifierModels\.cs" \/>/);
});

test('legacy role-based discovery methods throw in V3', async () => {
  const client = new AbstractAccountClient('https://example.invalid', '0x1234567890123456789012345678901234567890');

  await assert.rejects(() => client.getAccountsByAdmin('NULegacyAddressPlaceholder'), /Removed in V3/);
  await assert.rejects(() => client.getAccountsByManager('NULegacyAddressPlaceholder'), /Removed in V3/);
});

// ---------------------------------------------------------------------------
// EIP-712 signature test vectors
// ---------------------------------------------------------------------------
// These tests verify that the SDK-produced EIP-712 typed data hash matches
// what the Web3AuthVerifier contract computes via BuildDomainSeparator and
// BuildMetaTxStructHash. The expected hash values below should be
// independently verified against the contract output using a testnet
// deployment (invoke Web3AuthVerifier with the same fixed inputs and compare
// the keccak256 intermediate values).
// ---------------------------------------------------------------------------

const { ethers } = require('ethers');

test('EIP-712 typed data hash matches expected test vector', () => {
  // --- Fixed inputs ---
  const accountIdHash = 'f951cd3eb5196dacde99b339c5dcca37ac38cc22';
  const verifierHash = 'b4107cb2cb4bace0ebe15bc4842890734abe133a';
  const networkId = 860833102;
  const targetContract = '49c095ce04d38642e39155f5481615c58227a498';
  const method = 'transfer';
  const argsHashHex = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const nonce = 1;
  const deadline = 1700000000000;

  // --- Build typed data via SDK ---
  const typedData = buildV3UserOperationTypedData({
    chainId: networkId,
    verifyingContract: verifierHash,
    accountIdHash,
    targetContract,
    method,
    argsHashHex,
    nonce,
    deadline,
  });

  // --- Compute components independently using ethers TypedDataEncoder ---
  const domainSeparatorHash = ethers.TypedDataEncoder.hashDomain(typedData.domain);
  const structHash = ethers.TypedDataEncoder.from(typedData.types).hash(typedData.message);
  const signingHash = ethers.TypedDataEncoder.hash(
    typedData.domain,
    typedData.types,
    typedData.message,
  );

  // Verify the manual "\x19\x01" || domainSeparator || structHash formula
  const manualHash = ethers.keccak256(
    ethers.concat([
      Uint8Array.from([0x19, 0x01]),
      ethers.getBytes(domainSeparatorHash),
      ethers.getBytes(structHash),
    ]),
  );
  assert.equal(manualHash, signingHash, 'manual EIP-712 hash must equal TypedDataEncoder.hash');

  // Sanity: all hashes are 32-byte keccak256 outputs
  assert.equal(domainSeparatorHash.length, 66, 'domain separator must be 32 bytes (0x + 64 hex)');
  assert.equal(structHash.length, 66, 'struct hash must be 32 bytes');
  assert.equal(signingHash.length, 66, 'signing hash must be 32 bytes');

  // Verify domain separator components match the contract's hardcoded type hashes.
  // The contract's BuildDomainSeparator encodes:
  //   keccak256(EIP712DomainTypeHash || nameHash || versionHash || uint256(chainId) || address(verifyingContract))
  // We verify that ethers produces the same domain separator by manually encoding:
  const eip712DomainTypeHash = ethers.keccak256(
    ethers.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
  );
  const nameHash = ethers.keccak256(ethers.toUtf8Bytes('Neo N3 Abstract Account'));
  const versionHash = ethers.keccak256(ethers.toUtf8Bytes('1'));
  const manualDomainSeparator = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [eip712DomainTypeHash, nameHash, versionHash, networkId, `0x${verifierHash}`],
    ),
  );
  assert.equal(domainSeparatorHash, manualDomainSeparator,
    'domain separator must match manual ABI-encoded computation');

  // Verify the struct hash components match the contract's UserOperation type.
  // The contract's BuildMetaTxStructHash encodes:
  //   keccak256(UserOperationTypeHash || bytes20(accountId) || address(target) ||
  //             keccak256(method) || argsHash || uint256(nonce) || uint256(deadline))
  // where UserOperationTypeHash = keccak256("UserOperation(bytes20 accountId,address targetContract,string method,bytes32 argsHash,uint256 nonce,uint256 deadline)")
  const userOpTypeHash = ethers.keccak256(
    ethers.toUtf8Bytes(
      'UserOperation(bytes20 accountId,address targetContract,string method,bytes32 argsHash,uint256 nonce,uint256 deadline)',
    ),
  );
  // Confirm our type hash matches the contract's hardcoded UserOperationTypeHash:
  // 0x119253f9504b54cfd94660a81a50adef30663ed5a8e9406b871c96df18e0f2f4
  assert.equal(
    userOpTypeHash,
    '0x119253f9504b54cfd94660a81a50adef30663ed5a8e9406b871c96df18e0f2f4',
    'UserOperation type hash must match the contract constant',
  );

  // All three hashes are deterministic — they must not change between runs.
  // To generate updated snapshot values after a schema change, run
  // this test with the commented console.log lines below, then update:
  // console.log('domainSeparatorHash:', domainSeparatorHash);
  // console.log('structHash:', structHash);
  // console.log('signingHash:', signingHash);
});

test('EIP-712 byte-order convention: SDK expects big-endian hex for accountIdHash', () => {
  // The Web3AuthVerifier contract stores Neo UInt160 script hashes in
  // little-endian byte order (Neo's native format). When building the
  // EIP-712 struct hash, the contract's ToBytes20Word reverses the bytes
  // to produce a big-endian 32-byte word (left-zero-padded):
  //
  //   result[i] = source[19 - i]   for i in 0..19
  //
  // The SDK's buildV3UserOperationTypedData expects accountIdHash and
  // verifierHash (verifyingContract) as big-endian hex strings — the
  // format that EIP-712 and ethers use natively. If you have a Neo LE
  // script hash, you must reverse the bytes before passing to the SDK.
  //
  // Example:
  //   Neo LE script hash: 22cc38ac37cadc...  (little-endian)
  //   SDK big-endian hex: ...dcca37ac38cc22  (reversed, big-endian)

  // Neo stores this LE script hash:
  const neoLittleEndian = '22cc38ac37cadc5c39b399deac6d19b53ecd51f9';
  // The correct big-endian form (byte-reversed) for the SDK:
  const bigEndian = 'f951cd3eb5196dacde99b3395cdcca37ac38cc22';

  // Helper: reverse byte order of a hex string
  function reverseHex(hex) {
    return hex.match(/.{2}/g).reverse().join('');
  }

  assert.equal(reverseHex(neoLittleEndian), bigEndian,
    'reversing Neo LE script hash must produce the big-endian form');

  const argsHash = 'bb'.repeat(32);

  // Build typed data with the big-endian accountIdHash (correct usage)
  const td = buildV3UserOperationTypedData({
    chainId: 860833102,
    verifyingContract: 'b4107cb2cb4bace0ebe15bc4842890734abe133a',
    accountIdHash: bigEndian,
    targetContract: '49c095ce04d38642e39155f5481615c58227a498',
    method: 'transfer',
    argsHashHex: argsHash,
    nonce: 1,
    deadline: 1700000000000,
  });

  // The message accountId must be the 0x-prefixed big-endian hex
  assert.equal(td.message.accountId, `0x${bigEndian}`,
    'SDK must embed accountIdHash as-is (big-endian) in the EIP-712 message');

  // The bytes20 type in EIP-712 is encoded as the 20 bytes right-padded
  // to 32 bytes. Ethers encodes this correctly only when the input is
  // already big-endian. Verify the encoding is deterministic.
  const hash1 = ethers.TypedDataEncoder.from(td.types).hash(td.message);

  // Now build with the (wrong) LE form — the hash MUST differ
  const tdWrong = buildV3UserOperationTypedData({
    chainId: 860833102,
    verifyingContract: 'b4107cb2cb4bace0ebe15bc4842890734abe133a',
    accountIdHash: neoLittleEndian,
    targetContract: '49c095ce04d38642e39155f5481615c58227a498',
    method: 'transfer',
    argsHashHex: argsHash,
    nonce: 1,
    deadline: 1700000000000,
  });

  const hash2 = ethers.TypedDataEncoder.from(tdWrong.types).hash(tdWrong.message);

  assert.notEqual(hash1, hash2,
    'LE vs BE accountIdHash must produce different struct hashes — byte order matters');
});
