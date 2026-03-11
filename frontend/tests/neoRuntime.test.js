import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_NEO_ADDRESS_VERSION,
  createVerifyScript,
  getAddressFromScriptHash,
  getScriptHashFromAddress,
  reverseHex,
  invokeReadFunction,
} from '../src/utils/neo.js';

test('reverseHex reverses byte order', () => {
  assert.equal(reverseHex('0123456789abcdef'), 'efcdab8967452301');
});

test('Neo address helpers round-trip a known script hash', () => {
  const scriptHash = '13ef519c362973f9a34648a9eac5b71250b2a80a';
  const address = getAddressFromScriptHash(scriptHash);

  assert.equal(address, 'NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu');
  assert.equal(getScriptHashFromAddress(address), scriptHash);
  assert.equal(DEFAULT_NEO_ADDRESS_VERSION, 53);
});

test('createVerifyScript matches the known contract verify script encoding', () => {
  const script = createVerifyScript(
    '5be915aea3ce85e4752d522632f0a9520e377aaf',
    '56e5bbd0603bdf01699c047b2397ee0e'
  );

  assert.equal(
    script,
    '0c1056e5bbd0603bdf01699c047b2397ee0e11c01f0c067665726966790c14af7a370e52a9f03226522d75e485cea3ae15e95b41627d5b52'
  );
});

test('invokeReadFunction posts an invokefunction payload', async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls.push([url, options]);
    return {
      async json() {
        return { result: { state: 'HALT', stack: [] } };
      },
    };
  };

  try {
    const result = await invokeReadFunction('https://rpc.example.org', '0xabc', 'getThing', [
      { type: 'Hash160', value: '0011' },
    ]);

    assert.deepEqual(result, { state: 'HALT', stack: [] });
    assert.equal(calls.length, 1);
    const [url, options] = calls[0];
    assert.equal(url, 'https://rpc.example.org');
    assert.equal(options.method, 'POST');
    const payload = JSON.parse(options.body);
    assert.equal(payload.method, 'invokefunction');
    assert.deepEqual(payload.params, ['0xabc', 'getThing', [{ type: 'Hash160', value: '0011' }]]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
