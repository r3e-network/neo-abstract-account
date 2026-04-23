import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveMorpheusOracleCvmId,
  resolveMorpheusPaymasterEndpoint,
  resolveMorpheusRuntimeBase,
  resolveMorpheusRuntimeToken,
  resolveMorpheusWorkflowIds,
} from '../api/morpheus-base.js';
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

test('morpheus runtime base prefers direct testnet runtime domains', async () => {
  const originalRuntimeUrl = process.env.MORPHEUS_TESTNET_RUNTIME_URL;
  process.env.MORPHEUS_TESTNET_RUNTIME_URL = 'https://oracle.meshmini.app/testnet';

  try {
    assert.equal(
      resolveMorpheusRuntimeBase({ query: { morpheus_network: 'testnet' }, headers: {} }),
      'https://oracle.meshmini.app/testnet'
    );
  } finally {
    if (originalRuntimeUrl == null) delete process.env.MORPHEUS_TESTNET_RUNTIME_URL;
    else process.env.MORPHEUS_TESTNET_RUNTIME_URL = originalRuntimeUrl;
  }
});

test('morpheus runtime token prefers network-scoped values when present', () => {
  const snapshot = {
    MORPHEUS_MAINNET_RUNTIME_TOKEN: process.env.MORPHEUS_MAINNET_RUNTIME_TOKEN,
    MORPHEUS_TESTNET_RUNTIME_TOKEN: process.env.MORPHEUS_TESTNET_RUNTIME_TOKEN,
    MORPHEUS_RUNTIME_TOKEN: process.env.MORPHEUS_RUNTIME_TOKEN,
    MORPHEUS_TESTNET_PHALA_API_TOKEN: process.env.MORPHEUS_TESTNET_PHALA_API_TOKEN,
    PHALA_API_TOKEN: process.env.PHALA_API_TOKEN,
  };

  process.env.MORPHEUS_MAINNET_RUNTIME_TOKEN = 'mainnet-runtime-token';
  process.env.MORPHEUS_TESTNET_RUNTIME_TOKEN = 'testnet-runtime-token';
  process.env.MORPHEUS_RUNTIME_TOKEN = 'global-runtime-token';
  process.env.MORPHEUS_TESTNET_PHALA_API_TOKEN = 'testnet-phala-token';
  process.env.PHALA_API_TOKEN = 'global-phala-token';

  try {
    assert.equal(resolveMorpheusRuntimeToken('mainnet'), 'mainnet-runtime-token');
    assert.equal(resolveMorpheusRuntimeToken('testnet'), 'testnet-runtime-token');
  } finally {
    for (const [key, value] of Object.entries(snapshot)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('morpheus neodid proxy routes GET requests through the resolved runtime path', async () => {
  const originalFetch = global.fetch;
  const originalBaseUrl = process.env.MORPHEUS_API_BASE_URL;
  const originalRuntimeUrl = process.env.MORPHEUS_TESTNET_RUNTIME_URL;
  const calls = [];

  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      status: 200,
      text: async () => JSON.stringify({ providers: [{ id: 'google' }] }),
    };
  };
  delete process.env.MORPHEUS_API_BASE_URL;
  process.env.MORPHEUS_TESTNET_RUNTIME_URL = 'https://oracle.meshmini.app/testnet';

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
    assert.equal(calls[0].url, 'https://oracle.meshmini.app/testnet/neodid/providers');
    assert.equal(calls[0].options.method, 'GET');
    assert.deepEqual(res.payload, { providers: [{ id: 'google' }] });
  } finally {
    global.fetch = originalFetch;
    if (originalBaseUrl == null) delete process.env.MORPHEUS_API_BASE_URL;
    else process.env.MORPHEUS_API_BASE_URL = originalBaseUrl;
    if (originalRuntimeUrl == null) delete process.env.MORPHEUS_TESTNET_RUNTIME_URL;
    else process.env.MORPHEUS_TESTNET_RUNTIME_URL = originalRuntimeUrl;
  }
});

test('morpheus neodid proxy strips morpheus routing metadata but preserves payload fields', async () => {
  const originalFetch = global.fetch;
  const originalBaseUrl = process.env.MORPHEUS_API_BASE_URL;
  const originalRuntimeUrl = process.env.MORPHEUS_MAINNET_RUNTIME_URL;
  const calls = [];

  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    };
  };
  delete process.env.MORPHEUS_API_BASE_URL;
  process.env.MORPHEUS_MAINNET_RUNTIME_URL = 'https://oracle.meshmini.app/mainnet';

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
    assert.equal(calls[0].url, 'https://oracle.meshmini.app/mainnet/neodid/recovery-ticket');
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
    if (originalRuntimeUrl == null) delete process.env.MORPHEUS_MAINNET_RUNTIME_URL;
    else process.env.MORPHEUS_MAINNET_RUNTIME_URL = originalRuntimeUrl;
  }
});

test('morpheus oracle key proxy routes GET requests through the unified edge path', async () => {
  const originalFetch = global.fetch;
  const originalBaseUrl = process.env.MORPHEUS_API_BASE_URL;
  const originalRuntimeUrl = process.env.MORPHEUS_TESTNET_RUNTIME_URL;
  const calls = [];

  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      status: 200,
      text: async () => JSON.stringify({ public_key: 'demo-public-key' }),
    };
  };
  delete process.env.MORPHEUS_API_BASE_URL;
  process.env.MORPHEUS_TESTNET_RUNTIME_URL = 'https://oracle.meshmini.app/testnet';

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
    assert.equal(calls[0].url, 'https://oracle.meshmini.app/testnet/oracle/public-key');
    assert.equal(calls[0].options.method, 'GET');
    assert.deepEqual(res.payload, { public_key: 'demo-public-key' });
  } finally {
    global.fetch = originalFetch;
    if (originalBaseUrl == null) delete process.env.MORPHEUS_API_BASE_URL;
    else process.env.MORPHEUS_API_BASE_URL = originalBaseUrl;
    if (originalRuntimeUrl == null) delete process.env.MORPHEUS_TESTNET_RUNTIME_URL;
    else process.env.MORPHEUS_TESTNET_RUNTIME_URL = originalRuntimeUrl;
  }
});

test('morpheus paymaster endpoint resolves from the generated runtime catalog', async () => {
  const originalRuntimeUrl = process.env.MORPHEUS_TESTNET_RUNTIME_URL;
  process.env.MORPHEUS_TESTNET_RUNTIME_URL = 'https://oracle.meshmini.app/testnet';

  try {
    assert.ok(resolveMorpheusWorkflowIds().includes('paymaster.authorize'));
    assert.equal(
      resolveMorpheusPaymasterEndpoint('testnet'),
      'https://oracle.meshmini.app/testnet/paymaster/authorize'
    );
  } finally {
    if (originalRuntimeUrl == null) delete process.env.MORPHEUS_TESTNET_RUNTIME_URL;
    else process.env.MORPHEUS_TESTNET_RUNTIME_URL = originalRuntimeUrl;
  }
});

test('morpheus oracle CVM id resolves from network-scoped env or runtime catalog', () => {
  const snapshot = {
    MORPHEUS_TESTNET_PAYMASTER_APP_ID: process.env.MORPHEUS_TESTNET_PAYMASTER_APP_ID,
    MORPHEUS_PAYMASTER_APP_ID: process.env.MORPHEUS_PAYMASTER_APP_ID,
  };

  process.env.MORPHEUS_TESTNET_PAYMASTER_APP_ID = 'testnet-app-override';
  process.env.MORPHEUS_PAYMASTER_APP_ID = 'global-app-override';

  try {
    assert.equal(resolveMorpheusOracleCvmId('testnet'), 'testnet-app-override');
    delete process.env.MORPHEUS_TESTNET_PAYMASTER_APP_ID;
    assert.equal(resolveMorpheusOracleCvmId('testnet'), 'global-app-override');
    delete process.env.MORPHEUS_PAYMASTER_APP_ID;
    assert.equal(resolveMorpheusOracleCvmId('testnet'), 'ddff154546fe22d15b65667156dd4b7c611e6093');
  } finally {
    for (const [key, value] of Object.entries(snapshot)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
