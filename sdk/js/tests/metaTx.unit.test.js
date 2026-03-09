const test = require('node:test');
const assert = require('node:assert/strict');
const { ethers } = require('ethers');

const { buildMetaTransactionTypedData } = require('../src/metaTx');
const { AbstractAccountClient } = require('../src');

const sampleParams = {
  chainId: 894710606,
  verifyingContract: '49c095ce04d38642e39155f5481615c58227a498',
  accountIdHex: `04${'11'.repeat(64)}`,
  targetContract: '49c095ce04d38642e39155f5481615c58227a498',
  method: 'getNonceForAccount',
  argsHashHex: 'ab'.repeat(32),
  nonce: 7,
  deadline: 1710000000,
};

test('buildMetaTransactionTypedData matches the contract field layout', () => {
  const payload = buildMetaTransactionTypedData(sampleParams);

  assert.deepEqual(payload, {
    domain: {
      name: 'Neo N3 Abstract Account',
      version: '1',
      chainId: sampleParams.chainId,
      verifyingContract: `0x${sampleParams.verifyingContract}`,
    },
    types: {
      MetaTransaction: [
        { name: 'accountId', type: 'bytes' },
        { name: 'targetContract', type: 'address' },
        { name: 'methodHash', type: 'bytes32' },
        { name: 'argsHash', type: 'bytes32' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    message: {
      accountId: `0x${sampleParams.accountIdHex}`,
      targetContract: `0x${sampleParams.targetContract}`,
      methodHash: ethers.keccak256(ethers.toUtf8Bytes(sampleParams.method)),
      argsHash: `0x${sampleParams.argsHashHex}`,
      nonce: String(sampleParams.nonce),
      deadline: String(sampleParams.deadline),
    },
  });
});

test('AbstractAccountClient.createEIP712Payload computes argsHash through the contract and returns typed data', async () => {
  const client = new AbstractAccountClient('https://example.invalid', sampleParams.verifyingContract);

  client.rpcClient.invokeScript = async () => ({
    state: 'HALT',
    stack: [
      {
        type: 'ByteString',
        value: Buffer.from(sampleParams.argsHashHex, 'hex').toString('base64'),
      },
    ],
  });

  const payload = await client.createEIP712Payload({
    chainId: sampleParams.chainId,
    accountIdHex: sampleParams.accountIdHex,
    targetContract: sampleParams.targetContract,
    method: sampleParams.method,
    args: [{ type: 'ByteArray', value: 'abcd' }],
    nonce: sampleParams.nonce,
    deadline: sampleParams.deadline,
  });

  assert.equal(payload.domain.name, 'Neo N3 Abstract Account');
  assert.equal(payload.domain.verifyingContract, `0x${sampleParams.verifyingContract}`);
  assert.equal(payload.message.accountId, `0x${sampleParams.accountIdHex}`);
  assert.equal(payload.message.targetContract, `0x${sampleParams.targetContract}`);
  assert.equal(payload.message.methodHash, ethers.keccak256(ethers.toUtf8Bytes(sampleParams.method)));
  assert.equal(payload.message.argsHash, `0x${sampleParams.argsHashHex}`);
  assert.equal(payload.message.nonce, String(sampleParams.nonce));
  assert.equal(payload.message.deadline, String(sampleParams.deadline));
});


test('AbstractAccountClient.createAccountPayload uses raw accountId bytes and the derived proxy hash', () => {
  const client = new AbstractAccountClient('https://example.invalid', sampleParams.verifyingContract);
  const payload = client.createAccountPayload('10203040', ['0x13ef519c362973f9a34648a9eac5b71250b2a80a'], 1, [], 0);
  const expectedVerifyScript = [
    '0c04',
    '10203040',
    '11c01f0c06766572696679',
    '0c14',
    '98a42782c5151648f55591e34286d304ce95c049',
    '41627d5b52',
  ].join('');
  const expectedProxyHash = client.constructor === AbstractAccountClient ? require('@cityofzion/neon-js').u.hash160(expectedVerifyScript) : null;

  assert.equal(payload.operation, 'createAccountWithAddress');
  assert.deepEqual(payload.args[0].toJson(), {
    type: 'ByteArray',
    value: Buffer.from('10203040', 'hex').toString('base64'),
  });
  assert.deepEqual(payload.args[1].toJson(), {
    type: 'Hash160',
    value: expectedProxyHash,
  });
});
