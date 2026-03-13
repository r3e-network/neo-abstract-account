const test = require('node:test');
const assert = require('node:assert/strict');
const { buildV3UserOp, buildEIP712PayloadForWeb3AuthVerifier } = require('../src/v3/UserOp');

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
