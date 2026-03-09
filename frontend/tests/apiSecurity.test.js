import test from 'node:test';
import assert from 'node:assert/strict';

import relayHandler from '../api/relay-transaction.js';
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
