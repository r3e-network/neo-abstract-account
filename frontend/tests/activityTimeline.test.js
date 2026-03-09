import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_ACTIVITY_ENTRIES,
  appendActivityEntries,
  createActivityEvent,
  summarizeActivityEvent,
} from '../src/features/operations/activity.js';

test('createActivityEvent normalizes ids, labels, and timestamps', () => {
  const event = createActivityEvent({
    type: 'relay_preflight',
    actor: 'relay',
    detail: 'HALT gas 42',
    createdAt: '2026-03-09T00:00:00.000Z',
  });

  assert.equal(event.type, 'relay_preflight');
  assert.equal(event.actor, 'relay');
  assert.equal(event.detail, 'HALT gas 42');
  assert.equal(event.createdAt, '2026-03-09T00:00:00.000Z');
  assert.match(event.id, /relay_preflight/);
});


test('appendActivityEntries caps activity history to the newest entries', () => {
  let entries = [];
  for (let index = 0; index < MAX_ACTIVITY_ENTRIES + 2; index += 1) {
    entries = appendActivityEntries(entries, {
      type: 'draft_created',
      actor: 'user',
      detail: `event-${index}`,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
    });
  }

  assert.equal(entries.length, MAX_ACTIVITY_ENTRIES);
  assert.equal(entries[0].detail, 'event-2');
  assert.equal(entries.at(-1).detail, `event-${MAX_ACTIVITY_ENTRIES + 1}`);
});

test('appendActivityEntries appends chronologically and keeps events immutable', () => {
  const initial = appendActivityEntries([], {
    type: 'draft_created',
    actor: 'user',
    detail: 'Created locally',
    createdAt: '2026-03-09T00:00:00.000Z',
  });
  const next = appendActivityEntries(initial, {
    type: 'signature_added',
    actor: 'evm',
    detail: 'Meta signature collected',
    createdAt: '2026-03-09T00:01:00.000Z',
  });

  assert.equal(initial.length, 1);
  assert.equal(next.length, 2);
  assert.equal(next[0].type, 'draft_created');
  assert.equal(next[1].type, 'signature_added');
});

test('summarizeActivityEvent generates compact user-facing text', () => {
  const summary = summarizeActivityEvent({
    type: 'broadcast_relay',
    actor: 'relay',
    detail: 'Submitted through relay',
    createdAt: '2026-03-09T00:02:00.000Z',
  });

  assert.match(summary, /relay/i);
  assert.match(summary, /Submitted through relay/);
});
