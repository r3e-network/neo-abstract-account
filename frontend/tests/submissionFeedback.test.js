import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSubmissionReceipt,
  getSubmissionButtonLabel,
  resolveLatestSubmissionReceipt,
} from '../src/features/operations/submissionFeedback.js';

test('getSubmissionButtonLabel returns pending copy for active actions', () => {
  assert.equal(getSubmissionButtonLabel('relay-check', ''), 'Check Relay');
  assert.equal(getSubmissionButtonLabel('relay-check', 'relay-check'), 'Checking Relay…');
  assert.equal(getSubmissionButtonLabel('client-broadcast', 'client-broadcast'), 'Broadcasting…');
  assert.equal(getSubmissionButtonLabel('relay-submit', 'relay-submit'), 'Submitting…');
});

test('buildSubmissionReceipt creates success cards with explorer links', () => {
  const receipt = buildSubmissionReceipt({
    action: 'relay-submit',
    phase: 'success',
    detail: 'Relay submission completed.',
    txid: '0x' + 'ab'.repeat(32),
    explorerBaseUrl: 'https://testnet.ndoras.com/transaction',
  });

  assert.deepEqual(receipt, {
    tone: 'success',
    title: 'Relay Submission Sent',
    detail: 'Relay submission completed.',
    txid: '0x' + 'ab'.repeat(32),
    explorerUrl: 'https://testnet.ndoras.com/transaction/0x' + 'ab'.repeat(32),
  });
});

test('buildSubmissionReceipt creates pending and error cards without txids', () => {
  assert.deepEqual(buildSubmissionReceipt({ action: 'relay-check', phase: 'pending' }), {
    tone: 'pending',
    title: 'Relay Check Running',
    detail: 'Waiting for the relay simulation result.',
    txid: '',
    explorerUrl: '',
  });
  assert.deepEqual(buildSubmissionReceipt({ action: 'client-broadcast', phase: 'error', detail: 'wallet rejected' }), {
    tone: 'error',
    title: 'Client Broadcast Failed',
    detail: 'wallet rejected',
    txid: '',
    explorerUrl: '',
  });
});


test('resolveLatestSubmissionReceipt builds a view receipt from persisted entries', () => {
  const receipt = resolveLatestSubmissionReceipt([
    { action: 'relay-check', phase: 'success', detail: 'HALT', createdAt: '2026-03-09T00:00:00.000Z' },
    { action: 'relay-submit', phase: 'success', detail: 'sent', txid: '0x' + '33'.repeat(32), createdAt: '2026-03-09T00:01:00.000Z' },
  ], { explorerBaseUrl: 'https://testnet.ndoras.com/transaction' });

  assert.deepEqual(receipt, {
    tone: 'success',
    title: 'Relay Submission Sent',
    detail: 'sent',
    txid: '0x' + '33'.repeat(32),
    explorerUrl: 'https://testnet.ndoras.com/transaction/0x' + '33'.repeat(32),
  });
});
