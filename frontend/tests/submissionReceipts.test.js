import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_SUBMISSION_RECEIPTS,
  appendSubmissionReceiptEntries,
  buildSubmissionReceiptHistoryItems,
  createSubmissionReceiptEntry,
  resolveLatestSubmissionReceiptEntry,
} from '../src/features/operations/submissionReceipts.js';

test('createSubmissionReceiptEntry normalizes txids and timestamps', () => {
  const entry = createSubmissionReceiptEntry({
    action: 'relay-submit',
    phase: 'success',
    detail: 'Relay submission completed.',
    txid: 'ab'.repeat(32),
    createdAt: '2026-03-09T00:00:00.000Z',
  });

  assert.deepEqual(entry, {
    action: 'relay-submit',
    phase: 'success',
    detail: 'Relay submission completed.',
    txid: '0x' + 'ab'.repeat(32),
    createdAt: '2026-03-09T00:00:00.000Z',
  });
});


test('appendSubmissionReceiptEntries caps stored receipt history to the newest entries', () => {
  let items = [];
  for (let index = 0; index < MAX_SUBMISSION_RECEIPTS + 2; index += 1) {
    items = appendSubmissionReceiptEntries(items, {
      action: 'relay-submit',
      phase: 'success',
      detail: `receipt-${index}`,
      createdAt: `2026-03-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
    });
  }

  assert.equal(items.length, MAX_SUBMISSION_RECEIPTS);
  assert.equal(items[0].detail, 'receipt-2');
  assert.equal(items.at(-1).detail, `receipt-${MAX_SUBMISSION_RECEIPTS + 1}`);
});

test('appendSubmissionReceiptEntries appends immutably and resolveLatestSubmissionReceiptEntry returns the newest', () => {
  const first = appendSubmissionReceiptEntries([], {
    action: 'relay-check',
    phase: 'success',
    detail: 'HALT',
    createdAt: '2026-03-09T00:00:00.000Z',
  });
  const second = appendSubmissionReceiptEntries(first, {
    action: 'relay-submit',
    phase: 'success',
    detail: 'sent',
    txid: '0x' + '11'.repeat(32),
    createdAt: '2026-03-09T00:01:00.000Z',
  });

  assert.equal(first.length, 1);
  assert.equal(second.length, 2);
  assert.equal(resolveLatestSubmissionReceiptEntry(second).detail, 'sent');
});

test('buildSubmissionReceiptHistoryItems formats latest-first receipt cards with explorer links', () => {
  const items = buildSubmissionReceiptHistoryItems([
    {
      action: 'relay-check',
      phase: 'success',
      detail: 'HALT',
      createdAt: '2026-03-08T23:59:00.000Z',
    },
    {
      action: 'relay-submit',
      phase: 'success',
      detail: 'sent',
      txid: '0x' + '22'.repeat(32),
      createdAt: '2026-03-09T00:01:00.000Z',
    },
  ], {
    explorerBaseUrl: 'https://testnet.ndoras.com/transaction',
    now: '2026-03-09T12:00:00.000Z',
    useUtc: true,
  });

  assert.equal(items[0].title, 'Relay Submission Sent');
  assert.equal(items[0].createdAt, '2026-03-09T00:01:00.000Z');
  assert.equal(items[0].createdLabel, 'Today · 00:01');
  assert.equal(items[0].explorerUrl, 'https://testnet.ndoras.com/transaction/0x' + '22'.repeat(32));
  assert.equal(items[1].title, 'Relay Check Complete');
  assert.equal(items[1].createdLabel, 'Yesterday · 23:59');
});
