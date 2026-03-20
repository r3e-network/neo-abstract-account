import test from 'node:test';
import assert from 'node:assert/strict';

import morpheusNeoDidHandler from '../api/morpheus-neodid.js';
import morpheusOracleKeyHandler from '../api/morpheus-oracle-public-key.js';

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
      this.headers[String(name).toLowerCase()] = value;
      return this;
    },
    json(value) {
      this.payload = value;
      return this;
    },
  };
}

test('morpheus neodid proxy routes GET requests through the unified edge path', async () => {
  const originalFetch = global.fetch;
  const originalBaseUrl = process.env.MORPHEUS_API_BASE_URL;
  const calls = [];

  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      status: 200,
      text: async () => JSON.stringify({ providers: [{ id: 'google' }] }),
    };
  };
  process.env.MORPHEUS_API_BASE_URL = 'https://morpheus.meshmini.app';

  try {
    const res = createResponse();
    await morpheusNeoDidHandler({
      method: 'GET',
      query: {
        action: 'providers',
        morpheus_network: 'testnet',
      },
      headers: {},
    }, res);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://morpheus.meshmini.app/testnet/neodid/providers');
    assert.equal(calls[0].options.method, 'GET');
    assert.deepEqual(res.payload, { providers: [{ id: 'google' }] });
  } finally {
    global.fetch = originalFetch;
    if (originalBaseUrl == null) delete process.env.MORPHEUS_API_BASE_URL;
    else process.env.MORPHEUS_API_BASE_URL = originalBaseUrl;
  }
});

test('morpheus neodid proxy strips morpheus routing metadata but preserves payload fields', async () => {
  const originalFetch = global.fetch;
  const originalBaseUrl = process.env.MORPHEUS_API_BASE_URL;
  const calls = [];

  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    };
  };
  process.env.MORPHEUS_API_BASE_URL = 'https://morpheus.meshmini.app';

  try {
    const res = createResponse();
    await morpheusNeoDidHandler({
      method: 'POST',
      body: {
        action: 'recovery-ticket',
        morpheus_network: 'mainnet',
        network: 'neo_n3',
        account_id: 'demo-account',
      },
      query: {},
      headers: {},
    }, res);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://morpheus.meshmini.app/mainnet/neodid/recovery-ticket');
    assert.equal(calls[0].options.method, 'POST');
    const forwardedBody = JSON.parse(calls[0].options.body);
    assert.equal(forwardedBody.morpheus_network, undefined);
    assert.equal(forwardedBody.network, 'neo_n3');
    assert.equal(forwardedBody.account_id, 'demo-account');
    assert.deepEqual(res.payload, { ok: true });
  } finally {
    global.fetch = originalFetch;
    if (originalBaseUrl == null) delete process.env.MORPHEUS_API_BASE_URL;
    else process.env.MORPHEUS_API_BASE_URL = originalBaseUrl;
  }
});

test('morpheus oracle key proxy routes GET requests through the unified edge path', async () => {
  const originalFetch = global.fetch;
  const originalBaseUrl = process.env.MORPHEUS_API_BASE_URL;
  const calls = [];

  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      status: 200,
      text: async () => JSON.stringify({ public_key: 'demo-public-key' }),
    };
  };
  process.env.MORPHEUS_API_BASE_URL = 'https://morpheus.meshmini.app';

  try {
    const res = createResponse();
    await morpheusOracleKeyHandler({
      method: 'GET',
      query: {
        morpheus_network: 'testnet',
      },
      headers: {},
    }, res);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://morpheus.meshmini.app/testnet/oracle/public-key');
    assert.equal(calls[0].options.method, 'GET');
    assert.deepEqual(res.payload, { public_key: 'demo-public-key' });
  } finally {
    global.fetch = originalFetch;
    if (originalBaseUrl == null) delete process.env.MORPHEUS_API_BASE_URL;
    else process.env.MORPHEUS_API_BASE_URL = originalBaseUrl;
  }
});
