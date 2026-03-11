import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRelayPreflightExport,
  serializeRelayPreflightPayload,
  serializeRelayPreflightStack,
} from '../src/features/operations/relayPreflightActions.js';

test('serializeRelayPreflightPayload returns pretty JSON for relay requests', () => {
  const output = serializeRelayPreflightPayload({
    relayEndpoint: '/api/relay-transaction',
    simulate: true,
    metaInvocation: { scriptHash: '0x1234', operation: 'executeUnifiedByAddress' },
  });

  assert.match(output, /relay-transaction/);
  assert.match(output, /executeUnifiedByAddress/);
});

test('serializeRelayPreflightStack returns pretty JSON for decoded stack values', () => {
  const output = serializeRelayPreflightStack([
    { type: 'Integer', raw: '1', decoded: '1' },
    { type: 'ByteString', raw: 'aGVsbG8=', decoded: { hex: '68656c6c6f', utf8: 'hello' } },
  ]);

  assert.match(output, /"Integer"/);
  assert.match(output, /"hello"/);
});

test('buildRelayPreflightExport includes payload, summary, and decoded stack', () => {
  const exported = buildRelayPreflightExport({
    relayCheck: {
      label: 'Relay Check Passed',
      level: 'ready',
      detail: 'ok',
      payloadMode: 'meta',
      vmState: 'HALT',
      gasConsumed: '42',
      operation: 'executeUnifiedByAddress',
      exception: '',
      stack: [{ type: 'Integer', raw: '1', decoded: '1' }],
    },
    relayRequest: {
      relayEndpoint: '/api/relay-transaction',
      simulate: true,
      metaInvocation: { scriptHash: 'aa', operation: 'op', args: [] },
    },
  });

  assert.equal(exported.summary.label, 'Relay Check Passed');
  assert.equal(exported.request.metaInvocation.operation, 'op');
  assert.equal(exported.stack[0].decoded, '1');
});
