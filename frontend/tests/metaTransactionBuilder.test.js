import test from 'node:test';
import assert from 'node:assert/strict';
import { ethers } from 'ethers';

import {
  buildExecuteMetaTxByAddressInvocation,
  buildMetaTransactionTypedData,
  computeArgsHash,
  fetchNonceForAddress,
  recoverPublicKeyFromTypedDataSignature,
} from '../src/features/operations/metaTx.js';

test('buildMetaTransactionTypedData matches the contract field layout', () => {
  const params = {
    chainId: 894710606,
    verifyingContract: '49c095ce04d38642e39155f5481615c58227a498',
    accountIdHex: `04${'11'.repeat(64)}`,
    targetContract: '49c095ce04d38642e39155f5481615c58227a498',
    method: 'getNonceForAccount',
    argsHashHex: 'ab'.repeat(32),
    nonce: 7,
    deadline: 1710000000,
  };

  const payload = buildMetaTransactionTypedData(params);

  assert.deepEqual(payload, {
    domain: {
      name: 'Neo N3 Abstract Account',
      version: '1',
      chainId: params.chainId,
      verifyingContract: `0x${params.verifyingContract}`,
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
      accountId: `0x${params.accountIdHex}`,
      targetContract: `0x${params.targetContract}`,
      methodHash: ethers.keccak256(ethers.toUtf8Bytes(params.method)),
      argsHash: `0x${params.argsHashHex}`,
      nonce: String(params.nonce),
      deadline: String(params.deadline),
    },
  });
});

test('computeArgsHash invokes the contract helper and decodes the returned bytestring', async () => {
  const calls = [];
  const argsHashHex = 'cd'.repeat(32);
  const fetchImpl = async (url, options) => {
    calls.push([url, JSON.parse(options.body)]);
    return {
      async json() {
        return {
          result: {
            state: 'HALT',
            stack: [
              {
                type: 'ByteString',
                value: Buffer.from(argsHashHex, 'hex').toString('base64'),
              },
            ],
          },
        };
      },
    };
  };

  const result = await computeArgsHash({
    rpcUrl: 'https://rpc.example.org',
    aaContractHash: '711c1899a3b7fa0e055ae0d17c9acfcd1bef6423',
    args: [{ type: 'String', value: 'hello' }],
    fetchImpl,
  });

  assert.equal(result, argsHashHex);
  assert.equal(calls[0][0], 'https://rpc.example.org');
  assert.equal(calls[0][1].method, 'invokefunction');
  assert.equal(calls[0][1].params[1], 'computeArgsHash');
  assert.deepEqual(calls[0][1].params[2], [{ type: 'Array', value: [{ type: 'String', value: 'hello' }] }]);
});

test('fetchNonceForAddress reads the current meta-tx nonce for an address signer pair', async () => {
  const fetchImpl = async () => ({
    async json() {
      return {
        result: {
          state: 'HALT',
          stack: [{ type: 'Integer', value: '3' }],
        },
      };
    },
  });

  const nonce = await fetchNonceForAddress({
    rpcUrl: 'https://rpc.example.org',
    aaContractHash: '711c1899a3b7fa0e055ae0d17c9acfcd1bef6423',
    accountAddressScriptHash: '13ef519c362973f9a34648a9eac5b71250b2a80a',
    evmSignerAddress: '0x49c095ce04d38642e39155f5481615c58227a498',
    fetchImpl,
  });

  assert.equal(nonce, 3n);
});

test('buildExecuteMetaTxByAddressInvocation builds contract-aligned args for relay or export', () => {
  const invocation = buildExecuteMetaTxByAddressInvocation({
    aaContractHash: '711c1899a3b7fa0e055ae0d17c9acfcd1bef6423',
    accountAddressScriptHash: '13ef519c362973f9a34648a9eac5b71250b2a80a',
    evmPublicKeyHex: `04${'11'.repeat(64)}`,
    targetContract: 'd2a4cff31913016155e38e474a2c06d08be276cf',
    method: 'balanceOf',
    methodArgs: [{ type: 'Hash160', value: '0x13ef519c362973f9a34648a9eac5b71250b2a80a' }],
    argsHashHex: 'ab'.repeat(32),
    nonce: 4n,
    deadline: 1710001234,
    signatureHex: '12'.repeat(64),
  });

  assert.equal(invocation.scriptHash, '711c1899a3b7fa0e055ae0d17c9acfcd1bef6423');
  assert.equal(invocation.operation, 'executeMetaTxByAddress');
  assert.deepEqual(invocation.args, [
    { type: 'Hash160', value: '0x13ef519c362973f9a34648a9eac5b71250b2a80a' },
    { type: 'Array', value: [{ type: 'ByteArray', value: `0x04${'11'.repeat(64)}` }] },
    { type: 'Hash160', value: '0xd2a4cff31913016155e38e474a2c06d08be276cf' },
    { type: 'String', value: 'balanceOf' },
    { type: 'Array', value: [{ type: 'Hash160', value: '0x13ef519c362973f9a34648a9eac5b71250b2a80a' }] },
    { type: 'ByteArray', value: `0x${'ab'.repeat(32)}` },
    { type: 'Integer', value: '4' },
    { type: 'Integer', value: '1710001234' },
    { type: 'Array', value: [{ type: 'ByteArray', value: `0x${'12'.repeat(64)}` }] },
  ]);
});

test('recoverPublicKeyFromTypedDataSignature returns the uncompressed signer key', async () => {
  const wallet = ethers.Wallet.createRandom();
  const typedData = buildMetaTransactionTypedData({
    chainId: 894710606,
    verifyingContract: '49c095ce04d38642e39155f5481615c58227a498',
    accountIdHex: `04${'11'.repeat(64)}`,
    targetContract: '49c095ce04d38642e39155f5481615c58227a498',
    method: 'getNonceForAccount',
    argsHashHex: 'ab'.repeat(32),
    nonce: 7,
    deadline: 1710000000,
  });
  const signature = await wallet.signTypedData(typedData.domain, typedData.types, typedData.message);

  const publicKey = recoverPublicKeyFromTypedDataSignature({
    typedData,
    signature,
  });

  assert.equal(publicKey.toLowerCase(), wallet.signingKey.publicKey.toLowerCase());
});
