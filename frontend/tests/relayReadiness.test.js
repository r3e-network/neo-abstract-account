import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateRelayReadiness } from '../src/features/operations/relayReadiness.js';

test('relay readiness is green for signed raw transactions when raw relay forwarding is enabled', () => {
  const readiness = evaluateRelayReadiness({
    runtime: { relayEnabled: true, relayMetaEnabled: false, relayRawEnabled: true },
    transactionBody: { rawTransaction: '0xdeadbeef' },
    signatures: [],
  });

  assert.deepEqual(readiness, {
    level: 'ready',
    mode: 'raw',
    isReady: true,
    label: 'Relay Ready',
    detail: 'Signed raw transaction is ready for relay submission.',
  });
});

test('relay readiness warns when a raw transaction exists but raw relay forwarding is disabled', () => {
  const readiness = evaluateRelayReadiness({
    runtime: { relayEnabled: true, relayMetaEnabled: false, relayRawEnabled: false },
    transactionBody: { rawTransaction: '0xdeadbeef' },
    signatures: [],
  });

  assert.equal(readiness.isReady, false);
  assert.equal(readiness.level, 'warning');
  assert.equal(readiness.mode, 'raw');
  assert.match(readiness.detail, /enable raw relay forwarding/i);
});

test('relay readiness is green for relay invocations when relay invocation mode is enabled', () => {
  const readiness = evaluateRelayReadiness({
    runtime: { relayEnabled: true, relayMetaEnabled: true },
    transactionBody: {},
    signatures: [{
      kind: 'evm',
      metadata: {
        metaInvocation: {
          scriptHash: '5be915aea3ce85e4752d522632f0a9520e377aaf',
          operation: 'executeUnifiedByAddress',
          args: [],
        },
      },
    }],
  });

  assert.equal(readiness.isReady, true);
  assert.equal(readiness.mode, 'meta');
  assert.equal(readiness.level, 'ready');
  assert.match(readiness.detail, /relay-ready invocation/i);
});

test('relay readiness is warning-only when relay invocations exist but relay invocation mode is not publicly enabled', () => {
  const readiness = evaluateRelayReadiness({
    runtime: { relayEnabled: true, relayMetaEnabled: false },
    transactionBody: {},
    signatures: [{
      kind: 'evm',
      metadata: {
        metaInvocation: {
          scriptHash: '5be915aea3ce85e4752d522632f0a9520e377aaf',
          operation: 'executeUnifiedByAddress',
          args: [],
        },
      },
    }],
  });

  assert.equal(readiness.isReady, false);
  assert.equal(readiness.level, 'warning');
  assert.equal(readiness.mode, 'meta');
  assert.match(readiness.detail, /enable relay invocation mode/i);
});

test('relay readiness is blocked when no relay endpoint is configured', () => {
  const readiness = evaluateRelayReadiness({
    runtime: { relayEnabled: false, relayMetaEnabled: false },
    transactionBody: { rawTransaction: '0xdeadbeef' },
    signatures: [],
  });

  assert.equal(readiness.isReady, false);
  assert.equal(readiness.level, 'blocked');
  assert.match(readiness.detail, /relay endpoint is not configured/i);
});
