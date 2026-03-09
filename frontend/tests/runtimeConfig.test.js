import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

import {
  DEFAULT_ABSTRACT_ACCOUNT_HASH,
  DEFAULT_EXPLORER_BASE_URL,
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

test('default abstract account hash tracks the hardened verified deployment', () => {
  assert.equal(DEFAULT_ABSTRACT_ACCOUNT_HASH, '711c1899a3b7fa0e055ae0d17c9acfcd1bef6423');
});

test('resolveRpcUrl preserves explicit values and defaults otherwise', () => {
  assert.equal(resolveRpcUrl('https://example.com/rpc'), 'https://example.com/rpc');
  assert.equal(resolveRpcUrl(''), DEFAULT_RPC_URL);
});

test('frontend ships a runtime env example for browser and server routes', () => {
  const examplePath = path.resolve(import.meta.dirname, '..', '.env.example');
  assert.equal(fs.existsSync(examplePath), true, 'expected frontend/.env.example to exist');

  const example = fs.readFileSync(examplePath, 'utf8');
  assert.match(example, /VITE_AA_RPC_URL=/);
  assert.match(example, /VITE_SUPABASE_URL=/);
  assert.match(example, /VITE_SUPABASE_ANON_KEY=/);
  assert.match(example, /VITE_AA_RELAY_URL=/);
  assert.match(example, /VITE_AA_RELAY_META_ENABLED=/);
  assert.match(example, /AA_RELAY_RPC_URL=/);
  assert.match(example, /AA_RELAY_WIF=/);
  assert.match(example, /AA_RELAY_ALLOWED_HASH=/);
  assert.match(example, /AA_RELAY_ALLOW_RAW_FORWARD=/);
  assert.match(example, /SUPABASE_SERVICE_ROLE_KEY=/);
  assert.match(example, /server-only/i);
});

test('getRuntimeConfig prefers Vite overrides', () => {
  const config = getRuntimeConfig({
    VITE_AA_HASH: '0x1111111111111111111111111111111111111111',
    VITE_AA_RPC_URL: 'https://rpc.example.org'
  });

  assert.deepEqual(config, {
    abstractAccountHash: '1111111111111111111111111111111111111111',
    rpcUrl: 'https://rpc.example.org',
    supabaseUrl: '',
    supabaseAnonKey: '',
    relayEndpoint: '/api/relay-transaction',
    relayRpcUrl: 'https://rpc.example.org',
    relayMetaEnabled: false,
    relayRawEnabled: false,
    explorerBaseUrl: DEFAULT_EXPLORER_BASE_URL,
  });
});
