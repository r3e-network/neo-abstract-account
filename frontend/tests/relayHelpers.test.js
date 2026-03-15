import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALLOWED_RELAY_META_OPERATIONS,
  convertContractParamFromJson,
  normalizeRelayPayload,
  sanitizeMetaInvocationForRelay,
} from '../api/relayHelpers.js';

test('normalizeRelayPayload prefers raw transactions when provided', () => {
  assert.deepEqual(
    normalizeRelayPayload({ rawTransaction: '0xdeadbeef' }),
    { mode: 'raw', rawTransaction: 'deadbeef' }
  );
});


test('sanitizeMetaInvocationForRelay only accepts configured AA wrapper invocations and strips caller signers', () => {
  const metaInvocation = {
    scriptHash: '0x5be915aea3ce85e4752d522632f0a9520e377aaf',
    operation: 'executeUnifiedByAddress',
    args: [{ type: 'String', value: 'ok' }],
    signers: [{ account: '0xattacker', scopes: 255 }],
  };

  assert.ok(ALLOWED_RELAY_META_OPERATIONS.includes('executeUnified'));
  assert.ok(ALLOWED_RELAY_META_OPERATIONS.includes('executeUnifiedByAddress'));
  assert.ok(ALLOWED_RELAY_META_OPERATIONS.includes('executeUserOp'));
  assert.deepEqual(
    sanitizeMetaInvocationForRelay(metaInvocation, {
      aaContractHash: '0x5be915aea3ce85e4752d522632f0a9520e377aaf',
    }),
    {
      scriptHash: '5be915aea3ce85e4752d522632f0a9520e377aaf',
      operation: 'executeUnifiedByAddress',
      args: [{ type: 'String', value: 'ok' }],
    },
  );
});

test('sanitizeMetaInvocationForRelay accepts V3 executeUserOp invocations', () => {
  const metaInvocation = {
    scriptHash: '0x5be915aea3ce85e4752d522632f0a9520e377aaf',
    operation: 'executeUserOp',
    args: [
      { type: 'Hash160', value: '0xf951cd3eb5196dacde99b339c5dcca37ac38cc22' },
      { type: 'Struct', value: [] },
    ],
  };

  assert.deepEqual(
    sanitizeMetaInvocationForRelay(metaInvocation, {
      aaContractHash: '0x5be915aea3ce85e4752d522632f0a9520e377aaf',
    }),
    {
      scriptHash: '5be915aea3ce85e4752d522632f0a9520e377aaf',
      operation: 'executeUserOp',
      args: [
        { type: 'Hash160', value: '0xf951cd3eb5196dacde99b339c5dcca37ac38cc22' },
        { type: 'Struct', value: [] },
      ],
    },
  );
});

test('sanitizeMetaInvocationForRelay rejects wrong contract hashes and unsupported operations', () => {
  assert.equal(
    sanitizeMetaInvocationForRelay({
      scriptHash: '0x1111111111111111111111111111111111111111',
      operation: 'executeUnifiedByAddress',
      args: [],
    }, {
      aaContractHash: '0x5be915aea3ce85e4752d522632f0a9520e377aaf',
    }),
    null,
  );

  assert.equal(
    sanitizeMetaInvocationForRelay({
      scriptHash: '0x5be915aea3ce85e4752d522632f0a9520e377aaf',
      operation: 'transfer',
      args: [],
    }, {
      aaContractHash: '0x5be915aea3ce85e4752d522632f0a9520e377aaf',
    }),
    null,
  );
});

test('normalizeRelayPayload accepts meta invocation payloads', () => {
  const metaInvocation = {
    scriptHash: '5be915aea3ce85e4752d522632f0a9520e377aaf',
    operation: 'executeUnifiedByAddress',
    args: [{ type: 'String', value: 'ok' }],
  };

  assert.deepEqual(
    normalizeRelayPayload({ metaInvocation }),
    { mode: 'meta', metaInvocation }
  );
  assert.deepEqual(
    normalizeRelayPayload({ meta_invocation: metaInvocation }),
    { mode: 'meta', metaInvocation }
  );
});

test('convertContractParamFromJson handles nested arrays and primitive contract params', () => {
  const calls = [];
  const sc = {
    ContractParam: {
      hash160(value) {
        calls.push(['hash160', value]);
        return { kind: 'hash160', value };
      },
      string(value) {
        calls.push(['string', value]);
        return { kind: 'string', value };
      },
      integer(value) {
        calls.push(['integer', value]);
        return { kind: 'integer', value };
      },
      byteArray(value) {
        calls.push(['byteArray', value]);
        return { kind: 'byteArray', value };
      },
      array(...items) {
        calls.push(['array', items]);
        return { kind: 'array', items };
      },
      any(value) {
        calls.push(['any', value]);
        return { kind: 'any', value };
      },
    },
  };
  const u = {
    HexString: {
      fromHex(value, reverse = false) {
        calls.push(['fromHex', value, reverse]);
        return `hex:${value}:${reverse}`;
      },
    },
  };

  const result = convertContractParamFromJson({
    type: 'Array',
    value: [
      { type: 'Hash160', value: '0x13ef519c362973f9a34648a9eac5b71250b2a80a' },
      { type: 'String', value: 'transfer' },
      { type: 'Integer', value: '12' },
      { type: 'ByteArray', value: '0x1234' },
      { type: 'Any', value: null },
    ],
  }, { sc, u });

  assert.equal(result.kind, 'array');
  assert.equal(result.items.length, 5);
  assert.deepEqual(calls[0], ['hash160', '13ef519c362973f9a34648a9eac5b71250b2a80a']);
  assert.deepEqual(calls[1], ['string', 'transfer']);
  assert.deepEqual(calls[2], ['integer', '12']);
  assert.deepEqual(calls[3], ['fromHex', '1234', true]);
  assert.deepEqual(calls[4], ['byteArray', 'hex:1234:true']);
  assert.deepEqual(calls[5], ['any', null]);
});

test('convertContractParamFromJson treats Struct as an ordered array payload for V3 user operations', () => {
  const calls = [];
  const sc = {
    ContractParam: {
      hash160(value) {
        calls.push(['hash160', value]);
        return { kind: 'hash160', value };
      },
      string(value) {
        calls.push(['string', value]);
        return { kind: 'string', value };
      },
      integer(value) {
        calls.push(['integer', value]);
        return { kind: 'integer', value };
      },
      byteArray(value) {
        calls.push(['byteArray', value]);
        return { kind: 'byteArray', value };
      },
      array(...items) {
        calls.push(['array', items]);
        return { kind: 'array', items };
      },
      any(value) {
        calls.push(['any', value]);
        return { kind: 'any', value };
      },
      boolean(value) {
        calls.push(['boolean', value]);
        return { kind: 'boolean', value };
      },
    },
  };
  const u = {
    HexString: {
      fromHex(value, reverse = false) {
        calls.push(['fromHex', value, reverse]);
        return `hex:${value}:${reverse}`;
      },
    },
  };

  const result = convertContractParamFromJson({
    type: 'Struct',
    value: [
      { type: 'Hash160', value: '0x13ef519c362973f9a34648a9eac5b71250b2a80a' },
      { type: 'String', value: 'balanceOf' },
      { type: 'Array', value: [] },
      { type: 'Integer', value: '0' },
      { type: 'Integer', value: '1710000000' },
      { type: 'ByteArray', value: '0x' },
    ],
  }, { sc, u });

  assert.equal(result.kind, 'array');
  assert.equal(result.items.length, 6);
});
