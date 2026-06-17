import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

import relayHandler, * as relayModule from '../api/relay-transaction.js';
import draftOperatorHandler from '../api/draft-operator.js';
import { checkRateLimit, resolveClientIp, resolveRateLimitFailure } from '../api/rateLimiter.js';

const { resolveRelayExecutionConfig } = relayModule;

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

test('relay API reports missing client identity distinctly', async () => {
  const snapshot = {
    AA_TRUST_PROXY_HEADERS: process.env.AA_TRUST_PROXY_HEADERS,
    TRUST_PROXY_HEADERS: process.env.TRUST_PROXY_HEADERS,
    AA_TRUST_PROXY_HEADER: process.env.AA_TRUST_PROXY_HEADER,
    TRUST_PROXY_HEADER: process.env.TRUST_PROXY_HEADER,
  };

  delete process.env.AA_TRUST_PROXY_HEADERS;
  delete process.env.TRUST_PROXY_HEADERS;
  delete process.env.AA_TRUST_PROXY_HEADER;
  delete process.env.TRUST_PROXY_HEADER;

  try {
    const response = createResponse();
    await relayHandler({
      method: 'POST',
      headers: {},
      body: { request_id: `missing-client-${Date.now()}` },
    }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.payload?.error, 'client_identity_unavailable');
    assert.equal(response.headers['retry-after'], undefined);
  } finally {
    for (const [key, value] of Object.entries(snapshot)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
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

test('relay API rate limit ignores spoofed forwarded-for by default', async () => {
  const socketIp = `relay-socket-${Date.now()}`;
  for (let i = 0; i < 10; i += 1) {
    await relayHandler({
      method: 'POST',
      headers: { 'x-forwarded-for': `spoofed-relay-${i}` },
      socket: { remoteAddress: socketIp },
      body: {},
    }, createResponse());
  }

  const response = createResponse();
  await relayHandler({
    method: 'POST',
    headers: { 'x-forwarded-for': 'spoofed-relay-final' },
    socket: { remoteAddress: socketIp },
    body: {},
  }, response);

  assert.equal(response.statusCode, 429);
  assert.equal(response.payload?.error, 'rate_limit_exceeded');
});

test('draft operator API rate limit ignores spoofed forwarded-for by default', async () => {
  const socketIp = `operator-socket-${Date.now()}`;
  for (let i = 0; i < 10; i += 1) {
    await draftOperatorHandler({
      method: 'POST',
      headers: { 'x-forwarded-for': `spoofed-operator-${i}` },
      socket: { remoteAddress: socketIp },
      body: {},
    }, createResponse());
  }

  const response = createResponse();
  await draftOperatorHandler({
    method: 'POST',
    headers: { 'x-forwarded-for': 'spoofed-operator-final' },
    socket: { remoteAddress: socketIp },
    body: {},
  }, response);

  assert.equal(response.statusCode, 429);
  assert.equal(response.payload?.error, 'rate_limit_exceeded');
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
  assert.match(source, /resolveMorpheusOracleCvmId/);
});

test('relay API no longer routes paymaster authorization through the retired Phala remote path', () => {
  const source = fs.readFileSync(path.resolve('api/relay-transaction.js'), 'utf8');

  assert.doesNotMatch(source, /phala-remote/);
  assert.doesNotMatch(source, /callRemotePaymasterAuthorize/);
  assert.doesNotMatch(source, /resolvePhalaCliCommand/);
  assert.doesNotMatch(source, /x-phala-token/i);
  assert.doesNotMatch(source, /PHALA_/);
});

test('paymaster authorization derives account and operation hash from the sanitized invocation', () => {
  assert.equal(typeof relayModule.buildPaymasterRequest, 'function');

  const accountId = `0x${'aa'.repeat(20)}`;
  const targetContract = `0x${'bb'.repeat(20)}`;
  const metaInvocation = {
    scriptHash: '11'.repeat(20),
    operation: 'executeUserOp',
    args: [
      { type: 'Hash160', value: accountId },
      {
        type: 'Struct',
        value: [
          { type: 'Hash160', value: targetContract },
          { type: 'String', value: 'transfer' },
        ],
      },
    ],
  };

  const request = relayModule.buildPaymasterRequest({
    metaInvocation,
    network: 'testnet',
    paymaster: {
      account_id: `0x${'cc'.repeat(20)}`,
      operation_hash: `0x${'dd'.repeat(32)}`,
      dapp_id: 'client-dapp',
    },
  });

  assert.equal(request.account_id, accountId);
  assert.equal(request.userop_target_contract, targetContract);
  assert.equal(request.operation_hash, `0x${createHash('sha256').update(JSON.stringify(metaInvocation)).digest('hex')}`);
  assert.notEqual(request.account_id, `0x${'cc'.repeat(20)}`);
  assert.notEqual(request.operation_hash, `0x${'dd'.repeat(32)}`);
});

test('paymaster authorization derives downstream fields for legacy wrapper invocations', () => {
  const accountId = `0x${'aa'.repeat(20)}`;
  const targetContract = `0x${'bb'.repeat(20)}`;
  const metaInvocation = {
    scriptHash: '11'.repeat(20),
    operation: 'executeUnifiedByAddress',
    args: [
      { type: 'Hash160', value: accountId },
      { type: 'Hash160', value: targetContract },
      { type: 'String', value: 'transfer' },
      { type: 'Array', value: [] },
      { type: 'Array', value: [{ type: 'ByteArray', value: `0x04${'11'.repeat(64)}` }] },
      { type: 'ByteArray', value: `0x${'ab'.repeat(32)}` },
      { type: 'Integer', value: '7' },
      { type: 'Integer', value: String(Date.now() + 3600_000) },
      { type: 'Array', value: [{ type: 'ByteArray', value: `0x${'12'.repeat(64)}` }] },
    ],
  };

  const request = relayModule.buildPaymasterRequest({
    metaInvocation,
    network: 'testnet',
    paymaster: {
      account_id: `0x${'cc'.repeat(20)}`,
      dapp_id: 'client-dapp',
    },
  });

  assert.equal(request.account_id, accountId);
  assert.equal(request.userop_target_contract, targetContract);
  assert.equal(request.userop_method, 'transfer');
});

test('paymaster authorization derives downstream fields for homogeneous batch user operations', () => {
  const accountId = `0x${'aa'.repeat(20)}`;
  const targetContract = `0x${'bb'.repeat(20)}`;
  const userOp = {
    type: 'Struct',
    value: [
      { type: 'Hash160', value: targetContract },
      { type: 'String', value: 'transfer' },
      { type: 'Array', value: [] },
      { type: 'Integer', value: '1' },
      { type: 'Integer', value: String(Date.now() + 3600_000) },
      { type: 'ByteArray', value: '0x' },
    ],
  };
  const metaInvocation = {
    scriptHash: '11'.repeat(20),
    operation: 'executeUserOps',
    args: [
      { type: 'Hash160', value: accountId },
      { type: 'Array', value: [userOp, JSON.parse(JSON.stringify(userOp))] },
    ],
  };

  const request = relayModule.buildPaymasterRequest({
    metaInvocation,
    network: 'testnet',
    paymaster: { dapp_id: 'client-dapp' },
  });

  assert.equal(request.account_id, accountId);
  assert.equal(request.userop_target_contract, targetContract);
  assert.equal(request.userop_method, 'transfer');
  assert.equal(request.userop_batch_size, 2);
});

test('paymaster authorization rejects malformed account or target hashes', () => {
  assert.throws(() => relayModule.buildPaymasterRequest({
    metaInvocation: {
      scriptHash: '11'.repeat(20),
      operation: 'executeUserOp',
      args: [
        { type: 'Hash160', value: 'not-a-hash' },
        {
          type: 'Struct',
          value: [
            { type: 'Hash160', value: `0x${'bb'.repeat(20)}` },
            { type: 'String', value: 'transfer' },
          ],
        },
      ],
    },
    network: 'testnet',
    paymaster: {},
  }), /requires a supported account-bound operation/);

  assert.throws(() => relayModule.buildPaymasterRequest({
    metaInvocation: {
      scriptHash: '11'.repeat(20),
      operation: 'executeUserOp',
      args: [
        { type: 'Hash160', value: `0x${'aa'.repeat(20)}` },
        {
          type: 'Struct',
          value: [
            { type: 'Hash160', value: '1234' },
            { type: 'String', value: 'transfer' },
          ],
        },
      ],
    },
    network: 'testnet',
    paymaster: {},
  }), /requires a supported account-bound operation/);
});

test('rate limiter trusts only the configured proxy header', () => {
  const snapshot = {
    AA_TRUST_PROXY_HEADERS: process.env.AA_TRUST_PROXY_HEADERS,
    TRUST_PROXY_HEADERS: process.env.TRUST_PROXY_HEADERS,
    AA_TRUST_PROXY_HEADER: process.env.AA_TRUST_PROXY_HEADER,
    TRUST_PROXY_HEADER: process.env.TRUST_PROXY_HEADER,
  };

  process.env.AA_TRUST_PROXY_HEADERS = 'true';
  process.env.AA_TRUST_PROXY_HEADER = 'cf-connecting-ip';
  delete process.env.TRUST_PROXY_HEADERS;
  delete process.env.TRUST_PROXY_HEADER;

  try {
    assert.equal(
      resolveClientIp({
        headers: {
          'x-vercel-forwarded-for': 'spoofed-vercel',
          'x-forwarded-for': 'spoofed-client',
          'x-real-ip': 'spoofed-real-ip',
          'cf-connecting-ip': 'trusted-client',
        },
        socket: { remoteAddress: 'edge-proxy' },
      }),
      'trusted-client',
    );
  } finally {
    for (const [key, value] of Object.entries(snapshot)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('rate limiter refuses generic forwarded-for as a trusted proxy header', () => {
  const snapshot = {
    AA_TRUST_PROXY_HEADERS: process.env.AA_TRUST_PROXY_HEADERS,
    TRUST_PROXY_HEADERS: process.env.TRUST_PROXY_HEADERS,
    AA_TRUST_PROXY_HEADER: process.env.AA_TRUST_PROXY_HEADER,
    TRUST_PROXY_HEADER: process.env.TRUST_PROXY_HEADER,
  };

  process.env.AA_TRUST_PROXY_HEADERS = 'true';
  process.env.AA_TRUST_PROXY_HEADER = 'x-forwarded-for';
  delete process.env.TRUST_PROXY_HEADERS;
  delete process.env.TRUST_PROXY_HEADER;

  try {
    assert.equal(
      resolveClientIp({
        headers: { 'x-forwarded-for': 'spoofed-client' },
        socket: { remoteAddress: 'edge-proxy' },
      }),
      'edge-proxy',
    );
  } finally {
    for (const [key, value] of Object.entries(snapshot)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('rate limiter requires a socket or explicitly configured trusted proxy header', () => {
  const snapshot = {
    AA_TRUST_PROXY_HEADERS: process.env.AA_TRUST_PROXY_HEADERS,
    TRUST_PROXY_HEADERS: process.env.TRUST_PROXY_HEADERS,
    AA_TRUST_PROXY_HEADER: process.env.AA_TRUST_PROXY_HEADER,
    TRUST_PROXY_HEADER: process.env.TRUST_PROXY_HEADER,
  };

  delete process.env.AA_TRUST_PROXY_HEADERS;
  delete process.env.TRUST_PROXY_HEADERS;
  delete process.env.AA_TRUST_PROXY_HEADER;
  delete process.env.TRUST_PROXY_HEADER;

  try {
    assert.equal(
      resolveClientIp({
        headers: { 'x-forwarded-for': 'spoofed-client' },
      }),
      '',
    );
  } finally {
    for (const [key, value] of Object.entries(snapshot)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('rate limiter rejects missing client identity instead of using a shared bucket', async () => {
  const rate = await checkRateLimit('');

  assert.equal(rate.allowed, false);
  assert.equal(rate.error, 'client_identity_unavailable');
});

test('rate limiter formats missing client identity without retry-after', () => {
  const failure = resolveRateLimitFailure({
    allowed: false,
    error: 'client_identity_unavailable',
    retryAfter: 60,
  });

  assert.equal(failure.statusCode, 400);
  assert.equal(failure.error, 'client_identity_unavailable');
  assert.equal(failure.retryAfter, 0);
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
