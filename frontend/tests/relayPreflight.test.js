import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRelayPreflightRequest,
  normalizeRelayPreflightResult,
  runRelayPreflight,
} from '../src/features/operations/relayPreflight.js';

test('buildRelayPreflightRequest reuses the selected relay payload and adds simulate mode', () => {
  const request = buildRelayPreflightRequest({
    relayEndpoint: '/api/relay-transaction',
    relayPayloadMode: 'meta',
    transactionBody: {},
    signatures: [{
      kind: 'evm',
      metadata: {
        metaInvocation: {
          scriptHash: '5be915aea3ce85e4752d522632f0a9520e377aaf',
          operation: 'executeUnifiedByAddress',
          args: [{ type: 'String', value: 'ok' }],
        },
      },
    }],
  });

  assert.deepEqual(request, {
    relayEndpoint: '/api/relay-transaction',
    simulate: true,
    metaInvocation: {
      scriptHash: '5be915aea3ce85e4752d522632f0a9520e377aaf',
      operation: 'executeUnifiedByAddress',
      args: [{ type: 'String', value: 'ok' }],
    },
  });
});

test('normalizeRelayPreflightResult marks successful simulations as ready', () => {
  const result = normalizeRelayPreflightResult({
    simulate: true,
    ok: true,
    vmState: 'HALT',
    gasConsumed: '12345',
    operation: 'executeUnifiedByAddress',
  });

  assert.deepEqual(result, {
    ok: true,
    level: 'ready',
    label: 'Relay Check Passed',
    detail: 'executeUnifiedByAddress simulated successfully (gas 12345).',
    vmState: 'HALT',
    gasConsumed: '12345',
    operation: 'executeUnifiedByAddress',
    payloadMode: 'best',
    exception: '',
    supported: true,
    stack: [],
  });
});

test('normalizeRelayPreflightResult surfaces unsupported raw simulation as warning', () => {
  const result = normalizeRelayPreflightResult({
    simulate: true,
    ok: false,
    supported: false,
    code: 'simulation_not_supported_for_raw',
    message: 'Simulation is only available for relay-ready meta invocations.',
  });

  assert.deepEqual(result, {
    ok: false,
    level: 'warning',
    label: 'Simulation Unsupported',
    detail: 'Simulation is only available for relay-ready meta invocations.',
    vmState: '',
    gasConsumed: '',
    operation: '',
    payloadMode: 'best',
    exception: '',
    supported: false,
    stack: [],
  });
});

test('normalizeRelayPreflightResult preserves fault details for a failed simulation', () => {
  const result = normalizeRelayPreflightResult({
    simulate: true,
    ok: false,
    vmState: 'FAULT',
    operation: 'executeUnifiedByAddress',
    gasConsumed: '88',
    exception: 'Invalid Nonce',
  });

  assert.deepEqual(result, {
    ok: false,
    level: 'blocked',
    label: 'Relay Check Failed',
    detail: 'Invalid Nonce',
    vmState: 'FAULT',
    gasConsumed: '88',
    operation: 'executeUnifiedByAddress',
    payloadMode: 'best',
    exception: 'Invalid Nonce',
    supported: true,
    stack: [],
  });
});

test('normalizeRelayPreflightResult preserves returned stack items for inspection', () => {
  const result = normalizeRelayPreflightResult({
    simulate: true,
    ok: true,
    vmState: 'HALT',
    gasConsumed: '99',
    operation: 'executeUnifiedByAddress',
    stack: [{ type: 'Integer', value: '1' }, { type: 'ByteString', value: 'YWJjZA==' }],
  });

  assert.deepEqual(result.stack, [{ type: 'Integer', value: '1' }, { type: 'ByteString', value: 'YWJjZA==' }]);
});

test('normalizeRelayPreflightResult preserves structured validation preview details', () => {
  const result = normalizeRelayPreflightResult({
    simulate: true,
    ok: true,
    vmState: 'HALT',
    gasConsumed: '42',
    operation: 'executeUserOp',
    validationPreview: {
      deadlineValid: true,
      nonceAcceptable: false,
      hasVerifier: true,
      verifier: 'b4107cb2cb4bace0ebe15bc4842890734abe133a',
      hook: '1111111111111111111111111111111111111111',
    },
  });

  assert.deepEqual(result.validationPreview, {
    deadlineValid: true,
    nonceAcceptable: false,
    hasVerifier: true,
    verifier: 'b4107cb2cb4bace0ebe15bc4842890734abe133a',
    hook: '1111111111111111111111111111111111111111',
  });
});

test('relay preflight payloads are exportable for draft metadata persistence', () => {
  const result = normalizeRelayPreflightResult({
    simulate: true,
    ok: true,
    vmState: 'HALT',
    gasConsumed: '77',
    operation: 'executeUnifiedByAddress',
    stack: [{ type: 'Integer', value: '1' }],
  }, 'meta');

  assert.equal(result.payloadMode, 'meta');
  assert.deepEqual(result.stack, [{ type: 'Integer', value: '1' }]);
});

test('runRelayPreflight submits simulate requests through the relay transport', async () => {
  const calls = [];
  const walletService = {
    async relayTransaction(payload) {
      calls.push(payload);
      return {
        simulate: true,
        ok: true,
        vmState: 'HALT',
        gasConsumed: '77',
        operation: 'executeUnifiedByAddress',
        stack: [{ type: 'Integer', value: '1' }],
        validationPreview: {
          deadlineValid: true,
          nonceAcceptable: true,
          hasVerifier: true,
          verifier: 'b4107cb2cb4bace0ebe15bc4842890734abe133a',
          hook: '0000000000000000000000000000000000000000',
        },
      };
    },
  };

  const result = await runRelayPreflight({
    walletService,
    relayEndpoint: '/api/relay-transaction',
    relayPayloadMode: 'meta',
    transactionBody: {},
    signatures: [{
      kind: 'evm',
      metadata: {
        metaInvocation: {
          scriptHash: '5be915aea3ce85e4752d522632f0a9520e377aaf',
          operation: 'executeUnifiedByAddress',
          args: [{ type: 'String', value: 'ok' }],
        },
      },
    }],
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].simulate, true);
  assert.equal(result.label, 'Relay Check Passed');
  assert.equal(result.operation, 'executeUnifiedByAddress');
  assert.equal(result.gasConsumed, '77');
  assert.deepEqual(result.stack, [{ type: 'Integer', value: '1' }]);
  assert.equal(result.validationPreview?.hasVerifier, true);
});
