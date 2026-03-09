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

test('relay readiness is green for meta invocations when relay meta mode is enabled', () => {
  const readiness = evaluateRelayReadiness({
    runtime: { relayEnabled: true, relayMetaEnabled: true },
    transactionBody: {},
    signatures: [{
      kind: 'evm',
      metadata: {
        metaInvocation: {
          scriptHash: '711c1899a3b7fa0e055ae0d17c9acfcd1bef6423',
          operation: 'executeMetaTxByAddress',
          args: [],
        },
      },
    }],
  });

  assert.equal(readiness.isReady, true);
  assert.equal(readiness.mode, 'meta');
  assert.equal(readiness.level, 'ready');
  assert.match(readiness.detail, /meta invocation/i);
});

test('relay readiness is warning-only when meta invocations exist but relay meta mode is not publicly enabled', () => {
  const readiness = evaluateRelayReadiness({
    runtime: { relayEnabled: true, relayMetaEnabled: false },
    transactionBody: {},
    signatures: [{
      kind: 'evm',
      metadata: {
        metaInvocation: {
          scriptHash: '711c1899a3b7fa0e055ae0d17c9acfcd1bef6423',
          operation: 'executeMetaTxByAddress',
          args: [],
        },
      },
    }],
  });

  assert.equal(readiness.isReady, false);
  assert.equal(readiness.level, 'warning');
  assert.equal(readiness.mode, 'meta');
  assert.match(readiness.detail, /enable relay meta mode/i);
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
