const test = require('node:test');
const assert = require('node:assert/strict');
const { buildV3UserOp, buildEIP712PayloadForWeb3AuthVerifier } = require('../src/v3/UserOp');
const { AbstractAccountClient } = require('../src/index');

test('buildV3UserOp constructs valid layout', () => {
  const op = buildV3UserOp({
    targetContract: '1234567890123456789012345678901234567890',
    method: 'transfer',
    args: [],
    nonce: 1,
    deadline: 9999999999
  });
  
  assert.equal(op.TargetContract, '1234567890123456789012345678901234567890');
  assert.equal(op.Method, 'transfer');
  assert.equal(op.Nonce, 1);
});

test('buildEIP712PayloadForWeb3AuthVerifier constructs correct domain', () => {
  const op = buildV3UserOp({
    targetContract: '1234567890123456789012345678901234567890',
    method: 'transfer',
    args: [],
    nonce: 1,
    deadline: 9999999999
  });

  const payload = buildEIP712PayloadForWeb3AuthVerifier({
    chainId: 894710606,
    verifierHash: '0x1234',
    accountId: 'abcd',
    userOp: op
  });

  assert.equal(payload.domain.name, 'Neo N3 Abstract Account');
  assert.equal(payload.domain.chainId, 894710606);
  assert.equal(payload.message.method, 'transfer');
});

test('createAccountPayload uses V3 registerAccount entrypoint and hash160 account id', () => {
  const client = new AbstractAccountClient('https://example.invalid', '0x1234567890123456789012345678901234567890');
  const payload = client.createAccountPayload({
    accountIdHex: '04'.padEnd(130, '1'),
    verifierContractHash: '0x2222222222222222222222222222222222222222',
    verifierParamsHex: 'abcd',
    hookContractHash: '0x3333333333333333333333333333333333333333',
    backupOwnerAddress: '0x4444444444444444444444444444444444444444',
    escapeTimelock: 3600,
  });

  assert.equal(payload.operation, 'registerAccount');
  assert.equal(payload.args[0].type, 20);
  assert.equal(payload.args[1].type, 20);
  assert.equal(payload.args.length, 6);
  assert.equal(client.deriveVirtualAccount('04'.padEnd(130, '1')).accountIdHash.length, 40);
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

test('legacy role-based discovery methods throw in V3', async () => {
  const client = new AbstractAccountClient('https://example.invalid', '0x1234567890123456789012345678901234567890');

  await assert.rejects(() => client.getAccountsByAdmin('NULegacyAddressPlaceholder'), /Removed in V3/);
  await assert.rejects(() => client.getAccountsByManager('NULegacyAddressPlaceholder'), /Removed in V3/);
});
