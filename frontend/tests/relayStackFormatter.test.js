import test from 'node:test';
import assert from 'node:assert/strict';

import { formatRelayStack, formatRelayStackItem } from '../src/features/operations/relayStackFormatter.js';

test('formatRelayStackItem decodes Integer and Boolean stack items', () => {
  assert.deepEqual(formatRelayStackItem({ type: 'Integer', value: '42' }), {
    type: 'Integer',
    raw: '42',
    decoded: '42',
  });

  assert.deepEqual(formatRelayStackItem({ type: 'Boolean', value: true }), {
    type: 'Boolean',
    raw: true,
    decoded: 'true',
  });
});

test('formatRelayStackItem decodes ByteString into hex and utf8 when printable', () => {
  assert.deepEqual(formatRelayStackItem({ type: 'ByteString', value: 'aGVsbG8=' }), {
    type: 'ByteString',
    raw: 'aGVsbG8=',
    decoded: {
      hex: '68656c6c6f',
      utf8: 'hello',
    },
  });
});

test('formatRelayStackItem decodes nested arrays recursively', () => {
  assert.deepEqual(formatRelayStackItem({
    type: 'Array',
    value: [
      { type: 'Integer', value: '1' },
      { type: 'ByteString', value: 'aGk=' },
    ],
  }), {
    type: 'Array',
    raw: [
      { type: 'Integer', value: '1' },
      { type: 'ByteString', value: 'aGk=' },
    ],
    decoded: [
      { type: 'Integer', raw: '1', decoded: '1' },
      { type: 'ByteString', raw: 'aGk=', decoded: { hex: '6869', utf8: 'hi' } },
    ],
  });
});

test('formatRelayStack formats full stack arrays for preflight rendering', () => {
  assert.deepEqual(formatRelayStack([
    { type: 'Integer', value: '1' },
    { type: 'ByteString', value: 'aGVsbG8=' },
  ]), [
    { type: 'Integer', raw: '1', decoded: '1' },
    { type: 'ByteString', raw: 'aGVsbG8=', decoded: { hex: '68656c6c6f', utf8: 'hello' } },
  ]);
});
