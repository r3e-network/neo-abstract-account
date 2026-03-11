import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDraftSummaryItems, buildDraftSummaryActions } from '../src/features/operations/draftSummary.js';

test('buildDraftSummaryItems derives account, preset, signer progress, relay mode, and latest activity', () => {
  const items = buildDraftSummaryItems({
    draft: {
      account: {
        accountAddressScriptHash: '13ef519c362973f9a34648a9eac5b71250b2a80a',
      },
      operation_body: {
        kind: 'multisig',
        method: 'executeUnifiedByAddress',
      },
      signer_requirements: [
        { id: 'neo:alice', kind: 'neo' },
        { id: 'evm:bob', kind: 'evm' },
      ],
      signatures: [
        { signerId: 'neo:alice', kind: 'neo', signatureHex: 'aa' },
      ],
      broadcast_mode: 'relay',
      metadata: {
        preset: 'multisigDraft',
        activity: [
          { id: 'evt-1', type: 'draft_created', detail: 'Share draft persisted', createdAt: '2026-03-09T00:00:00.000Z' },
          { id: 'evt-2', type: 'relay_preflight', detail: 'Relay Check Passed', createdAt: '2026-03-09T00:10:00.000Z' },
        ],
      },
    },
  });

  assert.deepEqual(items, [
    { label: 'Account', value: '13ef519c362973f9a34648a9eac5b71250b2a80a' },
    { label: 'Operation', value: 'Multisig Draft' },
    { label: 'Signers', value: '1/2 collected' },
    { label: 'Relay Mode', value: 'relay' },
    { label: 'Latest Activity', value: 'Relay Check Passed' },
  ]);
});

test('buildDraftSummaryActions exposes copyable fields when values are present', () => {
  const actions = buildDraftSummaryActions({
    draft: {
      account: { accountAddressScriptHash: '13ef519c362973f9a34648a9eac5b71250b2a80a' },
      share_path: '/tx/share-1',
      metadata: { activity: [{ id: 'evt-1', type: 'broadcast_relay', detail: '0x' + 'ab'.repeat(32), createdAt: '2026-03-09T00:00:00.000Z' }] },
    },
    shareUrl: 'https://example.org/tx/share-1',
    explorerBaseUrl: 'https://testnet.ndoras.com/transaction',
  });

  assert.deepEqual(actions, {
    Account: { label: 'Copy Account', value: '13ef519c362973f9a34648a9eac5b71250b2a80a' },
    'Share URL': { label: 'Copy Share URL', value: 'https://example.org/tx/share-1' },
    'Latest Activity': { id: 'open-url', label: 'View Explorer', url: 'https://testnet.ndoras.com/transaction/0x' + 'ab'.repeat(32) },
  });
});

test('buildDraftSummaryItems falls back safely when optional draft fields are missing', () => {
  const items = buildDraftSummaryItems({ draft: {} });

  assert.deepEqual(items, [
    { label: 'Account', value: 'Not available' },
    { label: 'Operation', value: 'Not staged' },
    { label: 'Signers', value: '0/0 collected' },
    { label: 'Relay Mode', value: 'client' },
    { label: 'Latest Activity', value: 'No activity yet' },
  ]);
});
