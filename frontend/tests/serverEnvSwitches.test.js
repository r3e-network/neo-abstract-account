import test from 'node:test';
import assert from 'node:assert/strict';

import * as relayModule from '../api/relay-transaction.js';
import { DEFAULT_ABSTRACT_ACCOUNT_HASH } from '../src/config/runtimeConfig.js';

// L2 regression coverage: VITE_* vars are inlined into the CLIENT build at build time, so a
// SERVER security switch keyed on them is build-time controllable and violates the
// server/client env split. These switches must read server-only env names:
//   - raw-forward enable            (AA_RELAY_*_ALLOW_RAW_FORWARD, not VITE_AA_RELAY_RAW_ENABLED)
//   - raw error/stack-trace leakage (AA_RELAY_INCLUDE_RAW_ERRORS, not VITE_AA_RELAY_INCLUDE_RAW_ERRORS)
//   - relay AA-contract allowlist   (AA_RELAY_*_ALLOWED_HASH, not VITE_AA_HASH*/VITE_ABSTRACT_ACCOUNT_HASH*)

const { resolveRelayExecutionConfig, shouldIncludeRawRelayErrors } = relayModule;

const ENV_KEYS = [
  'AA_RELAY_ALLOW_RAW_FORWARD',
  'AA_RELAY_MAINNET_ALLOW_RAW_FORWARD',
  'AA_RELAY_TESTNET_ALLOW_RAW_FORWARD',
  'VITE_AA_RELAY_RAW_ENABLED',
  'AA_RELAY_INCLUDE_RAW_ERRORS',
  'VITE_AA_RELAY_INCLUDE_RAW_ERRORS',
  'AA_RELAY_ALLOWED_HASH',
  'AA_RELAY_MAINNET_ALLOWED_HASH',
  'AA_RELAY_TESTNET_ALLOWED_HASH',
  'VITE_AA_HASH',
  'VITE_AA_HASH_TESTNET',
  'VITE_ABSTRACT_ACCOUNT_HASH',
  'VITE_ABSTRACT_ACCOUNT_HASH_TESTNET',
  'MORPHEUS_NETWORK',
  'NODE_ENV',
  'VERCEL_ENV',
  'AA_RELAY_ALLOW_CLIENT_NETWORK',
];

function snapshotEnv() {
  return Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
}

function restoreEnv(snapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
}

function clearAll() {
  for (const key of ENV_KEYS) delete process.env[key];
}

function execConfig() {
  return resolveRelayExecutionConfig({
    req: { query: {}, body: {}, headers: {} },
    requestPayload: {},
    paymaster: null,
  });
}

test('L2: raw-forward enable ignores VITE_AA_RELAY_RAW_ENABLED and honors the server var', () => {
  const snapshot = snapshotEnv();
  clearAll();

  try {
    process.env.VITE_AA_RELAY_RAW_ENABLED = '1';
    assert.equal(execConfig().allowRawRelayForwarding, false, 'client-build var must not flip a server switch');

    process.env.AA_RELAY_ALLOW_RAW_FORWARD = '1';
    assert.equal(execConfig().allowRawRelayForwarding, true, 'server env enables raw forwarding');

    delete process.env.AA_RELAY_ALLOW_RAW_FORWARD;
    process.env.AA_RELAY_MAINNET_ALLOW_RAW_FORWARD = '0';
    assert.equal(execConfig().allowRawRelayForwarding, false, 'network-scoped server var overrides the global one');
  } finally {
    restoreEnv(snapshot);
  }
});

test('L2: raw error/stack-trace leakage ignores VITE_AA_RELAY_INCLUDE_RAW_ERRORS and honors the server var', () => {
  const snapshot = snapshotEnv();
  clearAll();

  try {
    process.env.VITE_AA_RELAY_INCLUDE_RAW_ERRORS = '1';
    assert.equal(shouldIncludeRawRelayErrors(), false, 'client-build var must not enable stack-trace leakage');

    process.env.AA_RELAY_INCLUDE_RAW_ERRORS = '1';
    assert.equal(shouldIncludeRawRelayErrors(), true, 'server env enables raw relay errors');
  } finally {
    restoreEnv(snapshot);
  }
});

test('L2: the relay AA-contract allowlist ignores VITE_ hash fallbacks and honors the server var', () => {
  const snapshot = snapshotEnv();
  clearAll();

  const viteInjected = '44'.repeat(20);
  const serverConfigured = '55'.repeat(20);

  try {
    process.env.VITE_AA_HASH = `0x${viteInjected}`;
    process.env.VITE_ABSTRACT_ACCOUNT_HASH = `0x${viteInjected}`;
    assert.equal(
      execConfig().allowedAaContractHash,
      DEFAULT_ABSTRACT_ACCOUNT_HASH,
      'client-build hash vars must not repoint the relay allowlist — compiled default wins',
    );

    process.env.AA_RELAY_ALLOWED_HASH = `0x${serverConfigured}`;
    assert.equal(
      execConfig().allowedAaContractHash,
      serverConfigured,
      'server env configures the allowlist',
    );
  } finally {
    restoreEnv(snapshot);
  }
});
