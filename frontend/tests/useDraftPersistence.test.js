import test from 'node:test';
import assert from 'node:assert/strict';

import { useDraftPersistence } from '../src/features/operations/useDraftPersistence.js';

function createHarness({ shareSlug = '', store = {} } = {}) {
  const calls = [];
  const draftStore = {
    async appendActivity(slug, event, options) {
      calls.push(['appendActivity', slug, event, options]);
      if (store.appendActivity) return store.appendActivity(slug, event, options);
      return { metadata: {} };
    },
    async appendSubmissionReceipt(slug, entry, options) {
      calls.push(['appendSubmissionReceipt', slug, entry, options]);
      if (store.appendSubmissionReceipt) return store.appendSubmissionReceipt(slug, entry, options);
      return { metadata: {} };
    },
  };
  const persistence = useDraftPersistence({
    draftStore,
    getShareSlug: () => shareSlug,
    getAccessMutationOptions: () => ({ accessSlug: 'collab-1' }),
    getOperatorMutationOptions: () => ({ accessSlug: 'operator-1' }),
    devWarnTag: 'test',
  });
  return { calls, persistence };
}

test('appendActivity applies locally first and skips remote sync without a share slug', async () => {
  const { calls, persistence } = createHarness({ shareSlug: '' });

  await persistence.appendActivity({ type: 'operation_staged', actor: 'workspace' });

  assert.equal(persistence.activityItems.value.length, 1);
  assert.equal(persistence.activityItems.value[0].type, 'operation_staged');
  assert.equal(calls.length, 0, 'no remote call for a local-only draft');
});

test('appendActivity adopts the server activity log when the sync succeeds', async () => {
  const serverActivity = [
    { type: 'draft_created', actor: 'supabase' },
    { type: 'signature_added', actor: 'evm' },
  ];
  const { calls, persistence } = createHarness({
    shareSlug: 'share-1',
    store: {
      appendActivity: async () => ({ metadata: { activity: serverActivity } }),
    },
  });

  await persistence.appendActivity({ type: 'signature_added', actor: 'evm' });

  assert.deepEqual(persistence.activityItems.value, serverActivity);
  assert.equal(calls[0][0], 'appendActivity');
  assert.equal(calls[0][1], 'share-1');
  assert.deepEqual(calls[0][3], { accessSlug: 'collab-1' });
});

test('appendActivity keeps the local entry when the remote sync fails (best-effort)', async () => {
  const { persistence } = createHarness({
    shareSlug: 'share-1',
    store: {
      appendActivity: async () => {
        throw new Error('EC_supabase_unreachable');
      },
    },
  });

  await assert.doesNotReject(() =>
    persistence.appendActivity({ type: 'relay_preflight', actor: 'relay' }),
  );
  assert.equal(persistence.activityItems.value.length, 1);
});

test('persistSubmissionReceipt mirrors the same local-first best-effort contract', async () => {
  const serverReceipts = [{ action: 'relay-submit', phase: 'success' }];
  const { calls, persistence } = createHarness({
    shareSlug: 'share-2',
    store: {
      appendSubmissionReceipt: async () => ({
        metadata: { submissionReceipts: serverReceipts },
      }),
    },
  });

  await persistence.persistSubmissionReceipt({ action: 'relay-submit', phase: 'success' });
  assert.deepEqual(persistence.submissionReceiptEntries.value, serverReceipts);
  assert.deepEqual(calls[0][3], { accessSlug: 'operator-1' });

  const failing = createHarness({
    shareSlug: 'share-3',
    store: {
      appendSubmissionReceipt: async () => {
        throw new Error('EC_supabase_unreachable');
      },
    },
  });
  await assert.doesNotReject(() =>
    failing.persistence.persistSubmissionReceipt({ action: 'client-broadcast', phase: 'error' }),
  );
  assert.equal(failing.persistence.submissionReceiptEntries.value.length, 1);
});
