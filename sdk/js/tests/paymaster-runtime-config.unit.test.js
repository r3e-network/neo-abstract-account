const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_TESTNET_PAYMASTER_BASE_URL,
  resolvePaymasterAuthorizeEndpoint,
  shouldSkipPaymasterRelayValidation,
} = require('./paymaster-runtime-config.js');

test('paymaster runtime config defaults to the public testnet authorize endpoint', () => {
  assert.equal(DEFAULT_TESTNET_PAYMASTER_BASE_URL, 'https://oracle.meshmini.app/testnet');
  assert.equal(
    resolvePaymasterAuthorizeEndpoint({}),
    'https://oracle.meshmini.app/testnet/paymaster/authorize'
  );
});

test('paymaster runtime config preserves an explicit authorize endpoint', () => {
  assert.equal(
    resolvePaymasterAuthorizeEndpoint({
      MORPHEUS_PAYMASTER_TESTNET_ENDPOINT: 'https://example.invalid/paymaster/authorize',
    }),
    'https://example.invalid/paymaster/authorize'
  );
});

test('paymaster runtime config derives the authorize endpoint from a runtime base url', () => {
  assert.equal(
    resolvePaymasterAuthorizeEndpoint({
      MORPHEUS_RUNTIME_URL: 'https://runtime.example.invalid/testnet/',
    }),
    'https://runtime.example.invalid/testnet/paymaster/authorize'
  );
});

test('paymaster relay validation skips when there is no explicit account or allowlist mutation path', () => {
  assert.match(
    shouldSkipPaymasterRelayValidation({}, { hasPhalaCli: false }),
    /PAYMASTER_ACCOUNT_ID/i
  );
});

test('paymaster relay validation runs when an explicit paymaster account is provided', () => {
  assert.equal(
    shouldSkipPaymasterRelayValidation({ PAYMASTER_ACCOUNT_ID: '0x1234' }, { hasPhalaCli: false }),
    ''
  );
});

test('paymaster relay validation runs when phala is available for remote allowlist updates', () => {
  assert.equal(
    shouldSkipPaymasterRelayValidation({}, { hasPhalaCli: true }),
    ''
  );
});
