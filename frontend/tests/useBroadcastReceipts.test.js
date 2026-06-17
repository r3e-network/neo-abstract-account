import test from 'node:test';
import assert from 'node:assert/strict';

import { ref } from 'vue';
import { useBroadcastReceipts } from '../src/features/operations/useBroadcastReceipts.js';

function createHarness({ entries = [] } = {}) {
  const submissionReceiptEntries = ref(entries);
  const receipts = useBroadcastReceipts({
    submissionReceiptEntries,
    explorerBaseUrl: 'https://explorer.test/tx',
    t: (_key, fallback) => fallback,
  });
  return { submissionReceiptEntries, receipts };
}

test('setSubmissionPending marks the action in-flight and shows a pending card', () => {
  const { receipts } = createHarness();

  assert.equal(receipts.isSubmissionPending.value, false);

  receipts.setSubmissionPending('client-broadcast');

  assert.equal(receipts.pendingSubmissionAction.value, 'client-broadcast');
  assert.equal(receipts.isSubmissionPending.value, true);
  assert.equal(receipts.activeSubmissionReceipt.value.tone, 'pending');
  assert.equal(receipts.activeSubmissionReceipt.value.title, 'Client Broadcast Running');
});

test('setSubmissionResult clears the pending flag and returns a normalized receipt entry', () => {
  const { receipts } = createHarness();
  receipts.setSubmissionPending('relay-submit');

  const txid = `0x${'a'.repeat(64)}`;
  const entry = receipts.setSubmissionResult('relay-submit', {
    phase: 'success',
    detail: 'Relay submission completed.',
    txid,
  });

  assert.equal(receipts.pendingSubmissionAction.value, '');
  assert.equal(receipts.isSubmissionPending.value, false);
  assert.equal(entry.action, 'relay-submit');
  assert.equal(entry.phase, 'success');
  assert.equal(entry.detail, 'Relay submission completed.');
  assert.equal(entry.txid, txid);
  assert.equal(receipts.activeSubmissionReceipt.value.tone, 'success');
  assert.equal(receipts.activeSubmissionReceipt.value.txid, txid);
});

test('activeSubmissionReceipt falls back to the latest persisted entry when no live receipt exists', () => {
  const { receipts } = createHarness({
    entries: [
      { action: 'client-broadcast', phase: 'success', detail: 'first', createdAt: '2026-06-01T00:00:00.000Z' },
      { action: 'relay-submit', phase: 'success', detail: 'latest', createdAt: '2026-06-02T00:00:00.000Z' },
    ],
  });

  assert.equal(receipts.activeSubmissionReceipt.value.tone, 'success');
  assert.equal(receipts.activeSubmissionReceipt.value.title, 'Relay Submission Sent');
  assert.equal(receipts.submissionReceiptHistoryItems.value.length, 2);
  assert.equal(receipts.submissionReceiptHistoryItems.value[0].action, 'relay-submit');
});

test('history derivation stays reactive to the shared submission-receipt entries ref', () => {
  const { submissionReceiptEntries, receipts } = createHarness();

  assert.equal(receipts.submissionReceiptHistoryItems.value.length, 0);

  submissionReceiptEntries.value = [
    { action: 'relay-check', phase: 'success', detail: 'ok', createdAt: '2026-06-03T00:00:00.000Z' },
  ];

  assert.equal(receipts.submissionReceiptHistoryItems.value.length, 1);
  assert.equal(receipts.submissionReceiptHistoryItems.value[0].action, 'relay-check');
});
