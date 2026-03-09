import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDraftStatusBanner } from '../src/features/operations/draftStatusBanner.js';

test('buildDraftStatusBanner derives latest relay-oriented status from recent activity', () => {
  const banner = buildDraftStatusBanner({
    status: 'relayed',
    activity: [
      { id: '1', type: 'draft_created', detail: 'Share draft persisted', createdAt: '2026-03-09T00:00:00.000Z' },
      { id: '2', type: 'relay_preflight', detail: 'Relay Check Passed', createdAt: '2026-03-09T00:10:00.000Z' },
      { id: '3', type: 'broadcast_relay', detail: '0xabc123', createdAt: '2026-03-09T00:20:00.000Z' },
    ],
  });

  assert.deepEqual(banner, {
    tone: 'relay',
    title: 'Latest Draft State',
    label: 'Relay Submitted',
    detail: '0xabc123',
    timestamp: '2026-03-09T00:20:00.000Z',
  });
});

test('buildDraftStatusBanner falls back to draft status when no activity exists', () => {
  const banner = buildDraftStatusBanner({ status: 'draft', activity: [] });

  assert.deepEqual(banner, {
    tone: 'draft',
    title: 'Latest Draft State',
    label: 'Draft Ready',
    detail: 'No activity recorded yet.',
    timestamp: '',
  });
});
