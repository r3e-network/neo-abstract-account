import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import relayHandler, { resolveRelayExecutionConfig } from '../api/relay-transaction.js';
import draftOperatorHandler from '../api/draft-operator.js';

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    json(value) {
      this.payload = value;
      return this;
    },
  };
}

test('relay API returns Retry-After header when rate limited', async () => {
  const ip = `relay-test-${Date.now()}`;
  for (let i = 0; i < 10; i += 1) {
    await relayHandler({
      method: 'POST',
      headers: { 'x-forwarded-for': ip },
      socket: { remoteAddress: ip },
      body: {},
    }, createResponse());
  }

  const response = createResponse();
  await relayHandler({
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    socket: { remoteAddress: ip },
    body: {},
  }, response);

  assert.equal(response.statusCode, 429);
  assert.equal(response.payload?.error, 'rate_limit_exceeded');
  assert.ok(Number(response.payload?.retryAfter) > 0);
  assert.equal(String(response.headers['retry-after']), String(response.payload?.retryAfter));
});

test('relay API does not rate limit the first request for a fresh client IP', async () => {
  const ip = `relay-first-${Date.now()}`;
  const response = createResponse();
  await relayHandler({
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    socket: { remoteAddress: ip },
    body: {},
  }, response);

  assert.notEqual(response.statusCode, 429);
  assert.notEqual(response.payload?.error, 'rate_limit_exceeded');
});

test('draft operator API returns Retry-After header when rate limited', async () => {
  const ip = `operator-test-${Date.now()}`;
  for (let i = 0; i < 10; i += 1) {
    await draftOperatorHandler({
      method: 'POST',
      headers: { 'x-forwarded-for': ip },
      socket: { remoteAddress: ip },
      body: {},
    }, createResponse());
  }

  const response = createResponse();
  await draftOperatorHandler({
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    socket: { remoteAddress: ip },
    body: {},
  }, response);

  assert.equal(response.statusCode, 429);
  assert.equal(response.payload?.error, 'rate_limit_exceeded');
  assert.ok(Number(response.payload?.retryAfter) > 0);
  assert.equal(String(response.headers['retry-after']), String(response.payload?.retryAfter));
});

test('draft operator API does not rate limit the first request for a fresh client IP', async () => {
  const ip = `operator-first-${Date.now()}`;
  const response = createResponse();
  await draftOperatorHandler({
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    socket: { remoteAddress: ip },
    body: {},
  }, response);

  assert.notEqual(response.statusCode, 429);
  assert.notEqual(response.payload?.error, 'rate_limit_exceeded');
});


test('draft operator claim validates the public key and uses compare-and-set semantics', () => {
  const source = fs.readFileSync(path.resolve('api/draft-operator.js'), 'utf8');

  assert.match(source, /importOperatorPublicKey\(publicKeyJwk\)/);
  assert.match(source, /\.is\('operator_public_key', null\)/);
  assert.match(source, /operator_key_already_claimed|operator_key_claim_failed/);
});

test('draft operator mutations use operator_counter compare-and-set updates', () => {
  const source = fs.readFileSync(path.resolve('api/draft-operator.js'), 'utf8');

  assert.match(source, /\.eq\('operator_counter', expectedCounter\)/);
  assert.match(source, /operator_counter_mismatch/);
});

test('relay API contains paymaster authorization before relay submission', () => {
  const source = fs.readFileSync(path.resolve('api/relay-transaction.js'), 'utf8');

  assert.match(source, /maybeAuthorizePaymaster/);
  assert.match(source, /paymaster_denied/);
  assert.match(source, /MORPHEUS_PAYMASTER_/);
});

test('relay API binds paymaster requests to dapp and operation hashes', () => {
  const source = fs.readFileSync(path.resolve('api/relay-transaction.js'), 'utf8');

  assert.match(source, /dapp_id/);
  assert.match(source, /operation_hash/);
  assert.match(source, /userop_target_contract/);
  assert.match(source, /userop_method/);
  assert.match(source, /sha256Hex\(metaInvocation\)/);
  assert.match(source, /paymaster \? \{ \.\.\.result, paymaster \} : result/);
});

test('relay execution config prefers network-scoped server settings when request network is testnet', () => {
  const snapshot = {
    AA_RELAY_MAINNET_RPC_URL: process.env.AA_RELAY_MAINNET_RPC_URL,
    AA_RELAY_TESTNET_RPC_URL: process.env.AA_RELAY_TESTNET_RPC_URL,
    AA_RELAY_RPC_URL: process.env.AA_RELAY_RPC_URL,
    AA_RELAY_MAINNET_ALLOWED_HASH: process.env.AA_RELAY_MAINNET_ALLOWED_HASH,
    AA_RELAY_TESTNET_ALLOWED_HASH: process.env.AA_RELAY_TESTNET_ALLOWED_HASH,
    AA_RELAY_ALLOWED_HASH: process.env.AA_RELAY_ALLOWED_HASH,
    AA_RELAY_MAINNET_WIF: process.env.AA_RELAY_MAINNET_WIF,
    AA_RELAY_TESTNET_WIF: process.env.AA_RELAY_TESTNET_WIF,
    AA_RELAY_WIF: process.env.AA_RELAY_WIF,
    AA_RELAY_MAINNET_ALLOW_RAW_FORWARD: process.env.AA_RELAY_MAINNET_ALLOW_RAW_FORWARD,
    AA_RELAY_TESTNET_ALLOW_RAW_FORWARD: process.env.AA_RELAY_TESTNET_ALLOW_RAW_FORWARD,
    AA_RELAY_ALLOW_RAW_FORWARD: process.env.AA_RELAY_ALLOW_RAW_FORWARD,
  };

  process.env.AA_RELAY_MAINNET_RPC_URL = 'https://mainnet.rpc.example';
  process.env.AA_RELAY_TESTNET_RPC_URL = 'https://testnet.rpc.example';
  process.env.AA_RELAY_RPC_URL = 'https://global.rpc.example';
  process.env.AA_RELAY_MAINNET_ALLOWED_HASH = `0x${'11'.repeat(20)}`;
  process.env.AA_RELAY_TESTNET_ALLOWED_HASH = `0x${'22'.repeat(20)}`;
  process.env.AA_RELAY_ALLOWED_HASH = `0x${'33'.repeat(20)}`;
  process.env.AA_RELAY_MAINNET_WIF = 'mainnet-wif';
  process.env.AA_RELAY_TESTNET_WIF = 'testnet-wif';
  process.env.AA_RELAY_WIF = 'global-wif';
  process.env.AA_RELAY_MAINNET_ALLOW_RAW_FORWARD = '0';
  process.env.AA_RELAY_TESTNET_ALLOW_RAW_FORWARD = '1';
  process.env.AA_RELAY_ALLOW_RAW_FORWARD = '0';

  try {
    const config = resolveRelayExecutionConfig({
      req: {
        query: {},
        headers: {},
      },
      requestPayload: {
        morpheus_network: 'testnet',
      },
      paymaster: null,
    });

    assert.equal(config.network, 'testnet');
    assert.equal(config.rpcUrl, 'https://testnet.rpc.example');
    assert.equal(config.allowedAaContractHash, '2222222222222222222222222222222222222222');
    assert.equal(config.relayWif, 'testnet-wif');
    assert.equal(config.allowRawRelayForwarding, true);
  } finally {
    for (const [key, value] of Object.entries(snapshot)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('account metadata API does not require a browser-visible API key for upserts', () => {
  const source = fs.readFileSync(path.resolve('api/account-metadata.js'), 'utf8');

  assert.doesNotMatch(source, /AA_METADATA_API_KEY/);
  assert.doesNotMatch(source, /x-api-key header required/);
});

test('gitignore quarantines local testnet secret artifacts', () => {
  const source = fs.readFileSync(path.resolve('..', '.gitignore'), 'utf8');

  assert.match(source, /tests\/\.env\.testnet/);
  assert.match(source, /tests\/VALIDATION_SUMMARY\.md/);
  assert.match(source, /tests\/MIXED_VERIFICATION_PLAN\.md/);
  assert.match(source, /tests\/mixed-verification-test\.js/);
  assert.match(source, /tests\/run-mixed-verification\.js/);
});
