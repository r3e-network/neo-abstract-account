import test from 'node:test';
import assert from 'node:assert/strict';

import {
  copyTextToClipboard,
  createDraftInteractionHandlers,
  downloadJsonFile,
  runDraftActivityAction,
  runDraftSummaryAction,
} from '../src/features/operations/viewActions.js';

test('copyTextToClipboard writes text and reports success', async () => {
  const writes = [];
  const copied = await copyTextToClipboard('hello', {
    clipboard: { writeText: async (value) => { writes.push(value); } },
  });

  assert.equal(copied, true);
  assert.deepEqual(writes, ['hello']);
});

test('runDraftSummaryAction copies the selected summary value and sets status', async () => {
  const writes = [];
  const messages = [];

  const handled = await runDraftSummaryAction(
    { label: 'Copy Share URL', value: 'https://example.org/tx/demo' },
    {
      clipboard: { writeText: async (value) => { writes.push(value); } },
      setStatus: (message) => messages.push(message),
    },
  );

  assert.equal(handled, true);
  assert.deepEqual(writes, ['https://example.org/tx/demo']);
  assert.deepEqual(messages, ['Copy Share URL copied to clipboard.']);
});

test('runDraftSummaryAction can open explorer links', async () => {
  const messages = [];
  const calls = [];

  const handled = await runDraftSummaryAction(
    { id: 'open-url', label: 'View Explorer', url: 'https://testnet.ndoras.com/transaction/0x' + 'ab'.repeat(32) },
    {
      windowRef: { open: (...args) => calls.push(args) },
      setStatus: (message) => messages.push(message),
    },
  );

  assert.equal(handled, true);
  assert.deepEqual(calls, [['https://testnet.ndoras.com/transaction/0x' + 'ab'.repeat(32), '_blank', 'noopener,noreferrer']]);
  assert.deepEqual(messages, ['Opened explorer link.']);
});

test('runDraftActivityAction handles share txid and explorer actions', async () => {
  const writes = [];
  const messages = [];
  const calls = [];
  const clipboard = { writeText: async (value) => { writes.push(value); } };

  assert.equal(
    await runDraftActivityAction(
      { id: 'copy-share', value: 'https://example.org/tx/demo' },
      { clipboard, setStatus: (message) => messages.push(message) },
    ),
    true,
  );
  assert.equal(
    await runDraftActivityAction(
      { id: 'copy-txid', value: '0x' + 'ab'.repeat(32) },
      { clipboard, setStatus: (message) => messages.push(message) },
    ),
    true,
  );
  assert.equal(
    await runDraftActivityAction(
      { id: 'open-url', url: 'https://testnet.ndoras.com/transaction/0x' + 'ab'.repeat(32) },
      { windowRef: { open: (...args) => calls.push(args) }, setStatus: (message) => messages.push(message) },
    ),
    true,
  );

  assert.deepEqual(writes, ['https://example.org/tx/demo', '0x' + 'ab'.repeat(32)]);
  assert.deepEqual(calls, [['https://testnet.ndoras.com/transaction/0x' + 'ab'.repeat(32), '_blank', 'noopener,noreferrer']]);
  assert.deepEqual(messages, ['Share link copied to clipboard.', 'Transaction ID copied to clipboard.', 'Opened explorer link.']);
});

test('runDraftActivityAction scrolls to the relay panel for jump actions', async () => {
  const messages = [];
  const calls = [];

  const handled = await runDraftActivityAction(
    { id: 'jump-relay', targetId: 'relay-preflight-panel' },
    {
      documentRef: {
        getElementById: (id) => ({
          scrollIntoView: (options) => calls.push({ id, options }),
        }),
      },
      setStatus: (message) => messages.push(message),
    },
  );

  assert.equal(handled, true);
  assert.deepEqual(calls, [{ id: 'relay-preflight-panel', options: { behavior: 'smooth', block: 'start' } }]);
  assert.deepEqual(messages, ['Jumped to relay preflight.']);
});

test('downloadJsonFile creates and revokes a temporary URL', async () => {
  const clicks = [];
  const revoked = [];
  let createdBlob = null;

  const exported = downloadJsonFile('{"ok":true}', {
    filename: 'relay-preflight.json',
    documentRef: {
      createElement: () => ({
        click: () => clicks.push('clicked'),
      }),
    },
    urlApi: {
      createObjectURL: (blob) => {
        createdBlob = blob;
        return 'blob:relay';
      },
      revokeObjectURL: (url) => revoked.push(url),
    },
  });

  assert.equal(exported, true);
  assert.ok(createdBlob instanceof Blob);
  assert.equal(await createdBlob.text(), '{"ok":true}');
  assert.deepEqual(clicks, ['clicked']);
  assert.deepEqual(revoked, ['blob:relay']);
});


test('createDraftInteractionHandlers skips empty relay stack copies', async () => {
  const messages = [];
  const writes = [];
  const handlers = createDraftInteractionHandlers({
    getRelayCheck: () => ({ stack: [] }),
    getRelayRequest: () => null,
    setStatus: (message) => messages.push(message),
    clipboard: { writeText: async (value) => { writes.push(value); } },
  });

  assert.equal(await handlers.copyRelayStack(), false);
  assert.deepEqual(writes, []);
  assert.deepEqual(messages, []);
});

test('createDraftInteractionHandlers shares relay copy export and action handlers', async () => {
  const writes = [];
  const messages = [];
  const clicks = [];
  const revoked = [];

  const handlers = createDraftInteractionHandlers({
    getRelayCheck: () => ({
      level: 'ready',
      label: 'Relay Check Passed',
      detail: 'ok',
      stack: [{ type: 'Integer', decoded: '1' }],
    }),
    getRelayRequest: () => ({ relayEndpoint: '/api/relay-transaction', simulate: true }),
    setStatus: (message) => messages.push(message),
    clipboard: { writeText: async (value) => { writes.push(value); } },
    documentRef: {
      createElement: () => ({ click: () => clicks.push('clicked') }),
      getElementById: () => ({ scrollIntoView: () => messages.push('scrolled') }),
    },
    urlApi: {
      createObjectURL: () => 'blob:relay',
      revokeObjectURL: (url) => revoked.push(url),
    },
  });

  assert.equal(await handlers.copyRelayPayload(), true);
  assert.equal(await handlers.copyRelayStack(), true);
  assert.equal(handlers.exportRelayPreflight(), true);
  assert.equal(await handlers.handleSummaryAction({ action: { label: 'Copy Account', value: 'NXabc' } }), true);
  assert.equal(await handlers.handleActivityAction({ action: { id: 'copy-share', value: 'https://example.org/tx/demo' } }), true);

  assert.match(writes[0], /relayEndpoint/);
  assert.match(writes[1], /Integer/);
  assert.equal(writes[2], 'NXabc');
  assert.equal(writes[3], 'https://example.org/tx/demo');
  assert.deepEqual(clicks, ['clicked']);
  assert.deepEqual(revoked, ['blob:relay']);
  assert.deepEqual(messages, [
    'Relay payload copied to clipboard.',
    'Decoded relay stack copied to clipboard.',
    'Relay preflight JSON exported.',
    'Copy Account copied to clipboard.',
    'Share link copied to clipboard.',
  ]);
});
