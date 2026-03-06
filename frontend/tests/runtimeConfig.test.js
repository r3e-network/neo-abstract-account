import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_ABSTRACT_ACCOUNT_HASH,
  DEFAULT_RPC_URL,
  getRuntimeConfig,
  resolveAbstractAccountHash,
  resolveRpcUrl,
  sanitizeHex
} from '../src/config/runtimeConfig.js';

test('sanitizeHex removes prefix and lowercases input', () => {
  assert.equal(sanitizeHex('0xABCD'), 'abcd');
  assert.equal(sanitizeHex('abcd'), 'abcd');
});

test('resolveAbstractAccountHash accepts valid 40-byte hex values', () => {
  assert.equal(
    resolveAbstractAccountHash('0x49C095CE04D38642E39155F5481615C58227A498'),
    '49c095ce04d38642e39155f5481615c58227a498'
  );
});

test('resolveAbstractAccountHash falls back for invalid values', () => {
  assert.equal(resolveAbstractAccountHash('bad-value'), DEFAULT_ABSTRACT_ACCOUNT_HASH);
});

test('resolveRpcUrl preserves explicit values and defaults otherwise', () => {
  assert.equal(resolveRpcUrl('https://example.com/rpc'), 'https://example.com/rpc');
  assert.equal(resolveRpcUrl(''), DEFAULT_RPC_URL);
});

test('getRuntimeConfig prefers Vite overrides', () => {
  const config = getRuntimeConfig({
    VITE_AA_HASH: '0x1111111111111111111111111111111111111111',
    VITE_AA_RPC_URL: 'https://rpc.example.org'
  });

  assert.deepEqual(config, {
    abstractAccountHash: '1111111111111111111111111111111111111111',
    rpcUrl: 'https://rpc.example.org'
  });
});
