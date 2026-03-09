import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTransactionExplorerUrl,
  extractLatestTransactionId,
  normalizeTransactionId,
} from '../src/features/operations/explorer.js';

test('normalizeTransactionId trims and prefixes transaction ids', () => {
  assert.equal(normalizeTransactionId('ab'.repeat(32)), '0x' + 'ab'.repeat(32));
  assert.equal(normalizeTransactionId('0x' + 'cd'.repeat(32)), '0x' + 'cd'.repeat(32));
  assert.equal(normalizeTransactionId('bad'), '');
});

test('buildTransactionExplorerUrl joins the explorer base and normalized txid', () => {
  assert.equal(
    buildTransactionExplorerUrl('https://testnet.ndoras.com/transaction', 'ab'.repeat(32)),
    `https://testnet.ndoras.com/transaction/${'0x' + 'ab'.repeat(32)}`,
  );
});

test('extractLatestTransactionId returns the newest broadcast txid from activity', () => {
  const txid = extractLatestTransactionId([
    { type: 'relay_preflight', detail: 'Relay Ready', createdAt: '2026-03-09T00:00:00.000Z' },
    { type: 'broadcast_client', detail: '0x' + '11'.repeat(32), createdAt: '2026-03-09T00:01:00.000Z' },
    { type: 'broadcast_relay', detail: '0x' + '22'.repeat(32), createdAt: '2026-03-09T00:02:00.000Z' },
  ]);

  assert.equal(txid, '0x' + '22'.repeat(32));
});
