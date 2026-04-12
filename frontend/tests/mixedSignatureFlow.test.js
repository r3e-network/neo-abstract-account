import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  appendSignatureEntries,
  buildTransactionDraftExport,
  summarizeSignerProgress,
} from '../src/features/operations/signatures.js';
import {
  buildDraftApprovalTypedData,
  buildDraftExportBundle,
  buildRelayBroadcastRequest,
  buildRelayPayloadOptions,
  buildStagedTransactionBody,
  executeBroadcast,
  resolveRelayPayloadMode,
} from '../src/features/operations/execution.js';

test('Neo and EVM signatures can attach to the same immutable draft', () => {
  const signatures = appendSignatureEntries([], {
    signerId: 'neo:alice',
    kind: 'neo',
    signatureHex: '0xAA',
  });
  const next = appendSignatureEntries(signatures, {
    signerId: 'evm:bob',
    kind: 'evm',
    signatureHex: '0xBB',
  });

  assert.equal(signatures.length, 1);
  assert.equal(next.length, 2);
  assert.equal(next[0].signatureHex, 'aa');
  assert.equal(next[1].signatureHex, 'bb');
});

test('signature entries preserve metadata for later relay/export use', () => {
  const entries = appendSignatureEntries([], {
    signerId: 'evm:bob',
    kind: 'evm',
    signatureHex: '0xBB',
    publicKey: `04${'11'.repeat(64)}`,
    metadata: { nonce: '3', deadline: 1710000000 },
  });

  assert.equal(entries[0].publicKey, `04${'11'.repeat(64)}`);
  assert.equal(entries[0].metadata.nonce, '3');
});

test('signer progress tracks satisfied and pending signers', () => {
  const progress = summarizeSignerProgress(
    [
      { id: 'neo:alice', kind: 'neo' },
      { id: 'evm:bob', kind: 'evm' },
    ],
    [{ signerId: 'neo:alice', kind: 'neo', signatureHex: 'aa' }]
  );

  assert.equal(progress.requiredCount, 2);
  assert.equal(progress.signatureCount, 1);
  assert.equal(progress.satisfied.length, 1);
  assert.equal(progress.pending.length, 1);
  assert.equal(progress.isComplete, false);
});

test('transaction draft export includes body, signatures, and share metadata', () => {
  const exported = buildTransactionDraftExport({
    account: { accountIdHex: 'aa' },
    operationBody: { method: 'transfer' },
    transactionBody: { txHex: 'deadbeef' },
    signerRequirements: [{ id: 'neo:alice', kind: 'neo' }],
    signatures: [{ signerId: 'neo:alice', kind: 'neo', signatureHex: 'aa' }],
    share: { draftId: 'draft-1' },
    broadcast: { mode: 'relay' },
  });

  assert.equal(exported.transactionBody.txHex, 'deadbeef');
  assert.equal(exported.signatures.length, 1);
  assert.equal(exported.share.draftId, 'draft-1');
  assert.equal(exported.broadcast.mode, 'relay');
});

test('buildStagedTransactionBody wraps client calls through executeUnifiedByAddress on the AA contract', () => {
  const body = buildStagedTransactionBody({
    aaContractHash: '5be915aea3ce85e4752d522632f0a9520e377aaf',
    account: {
      accountIdHex: '56e5bbd0603bdf01699c047b2397ee0e',
      accountAddressScriptHash: '13ef519c362973f9a34648a9eac5b71250b2a80a',
    },
    operationBody: {
      kind: 'invoke',
      targetContract: 'd2a4cff31913016155e38e474a2c06d08be276cf',
      method: 'balanceOf',
      args: [{ type: 'Hash160', value: '0x13ef519c362973f9a34648a9eac5b71250b2a80a' }],
    },
    signerAddress: 'NdzSignerAddress',
  });

  assert.equal(body.clientInvocation.scriptHash, '5be915aea3ce85e4752d522632f0a9520e377aaf');
  assert.equal(body.clientInvocation.operation, 'executeUnifiedByAddress');
  assert.deepEqual(body.clientInvocation.args, [
    { type: 'Hash160', value: '0x13ef519c362973f9a34648a9eac5b71250b2a80a' },
    { type: 'Hash160', value: '0xd2a4cff31913016155e38e474a2c06d08be276cf' },
    { type: 'String', value: 'balanceOf' },
    { type: 'Array', value: [{ type: 'Hash160', value: '0x13ef519c362973f9a34648a9eac5b71250b2a80a' }] },
    { type: 'Array', value: [] },
    { type: 'ByteArray', value: '0x' },
    { type: 'Integer', value: '0' },
    { type: 'Integer', value: '0' },
    { type: 'Array', value: [] },
  ]);
  assert.deepEqual(body.clientInvocation.signers, [{ account: 'NdzSignerAddress', scopes: 1 }]);
});

test('buildStagedTransactionBody prefers executeUserOp when accountIdHash is present', () => {
  const body = buildStagedTransactionBody({
    aaContractHash: '5be915aea3ce85e4752d522632f0a9520e377aaf',
    account: {
      accountIdHash: 'f951cd3eb5196dacde99b339c5dcca37ac38cc22',
      accountAddressScriptHash: '13ef519c362973f9a34648a9eac5b71250b2a80a',
    },
    operationBody: {
      kind: 'invoke',
      targetContract: 'd2a4cff31913016155e38e474a2c06d08be276cf',
      method: 'balanceOf',
      args: [{ type: 'Hash160', value: '0x13ef519c362973f9a34648a9eac5b71250b2a80a' }],
    },
    signerAddress: 'NdzSignerAddress',
  });

  assert.equal(body.clientInvocation.operation, 'executeUserOp');
  assert.equal(body.v3Invocation.operation, 'executeUserOp');
  assert.equal(body.legacyInvocation.operation, 'executeUnifiedByAddress');
  assert.equal(body.accountIdHash, 'f951cd3eb5196dacde99b339c5dcca37ac38cc22');
});

test('buildDraftApprovalTypedData creates an EVM-friendly approval payload from an immutable draft', () => {
  const typedData = buildDraftApprovalTypedData({
    draftRecord: {
      draft_id: 'draft-1',
      share_slug: 'share-1',
      account: { accountIdHex: 'aa11', accountAddressScriptHash: 'bb22' },
      transaction_body: { txHex: 'deadbeef', method: 'executeUnifiedByAddress' },
      signer_requirements: [{ id: 'evm:bob', kind: 'evm' }],
      broadcast_mode: 'relay',
    },
  });

  assert.equal(typedData.domain.name, 'Neo Abstract Account Workspace');
  assert.equal(typedData.domain.version, '1');
  assert.equal(typedData.message.shareSlug, 'share-1');
  assert.match(typedData.message.payloadDigest, /^0x[0-9a-f]{64}$/i);
  assert.equal(typedData.types.DraftApproval[0].name, 'draftId');
});

test('broadcast helpers route client broadcasts through the wallet and relay broadcasts through the relay endpoint', async () => {
  const calls = [];
  const wallet = {
    async invoke(input) {
      calls.push({ kind: 'invoke', input });
      return { txid: '0xabc' };
    },
    async relayTransaction(input) {
      calls.push({ kind: 'relay', input });
      return { txid: '0xdef' };
    },
  };

  const clientResult = await executeBroadcast({
    mode: 'client',
    signerAddress: 'NdzSignerAddress',
    transactionBody: {
      clientInvocation: {
        scriptHash: '5be915aea3ce85e4752d522632f0a9520e377aaf',
        operation: 'executeUnifiedByAddress',
        args: [{ type: 'String', value: 'ok' }],
      },
    },
    walletService: wallet,
    relayEndpoint: '/api/relay-transaction',
  });

  const relayResult = await executeBroadcast({
    mode: 'relay',
    morpheusNetwork: 'testnet',
    transactionBody: {
      rawTransaction: '0xDEADBEEF',
    },
    walletService: wallet,
    relayEndpoint: '/api/relay-transaction',
  });

  assert.equal(clientResult.txid, '0xabc');
  assert.equal(relayResult.txid, '0xdef');
  assert.deepEqual(calls[0], {
    kind: 'invoke',
    input: {
      scriptHash: '5be915aea3ce85e4752d522632f0a9520e377aaf',
      operation: 'executeUnifiedByAddress',
      args: [{ type: 'String', value: 'ok' }],
      signers: [{ account: 'NdzSignerAddress', scopes: 1 }],
    },
  });
  assert.deepEqual(calls[1], {
    kind: 'relay',
    input: {
      relayEndpoint: '/api/relay-transaction',
      morpheus_network: 'testnet',
      rawTransaction: 'deadbeef',
    },
  });
});

test('export bundle adds public and collaborator URLs without mutating the draft body', () => {
  const bundle = buildDraftExportBundle({
    draftRecord: {
      draft_id: 'draft-1',
      share_slug: 'share-1',
      collaboration_slug: 'collab-1',
      transaction_body: { txHex: 'deadbeef' },
    },
    origin: 'https://example.org',
  });

  assert.equal(bundle.share_url, 'https://example.org/tx/share-1');
  assert.equal(bundle.collaboration_url, 'https://example.org/tx/share-1?access=collab-1');
  assert.equal(bundle.transaction_body.txHex, 'deadbeef');
});

test('buildRelayPayloadOptions exposes raw mode only when raw relay forwarding is enabled', () => {
  const enabled = buildRelayPayloadOptions({
    runtime: { relayRawEnabled: true },
    transactionBody: { rawTransaction: '0xdeadbeef' },
    signatures: [{
      kind: 'evm',
      metadata: {
        metaInvocation: {
          scriptHash: '5be915aea3ce85e4752d522632f0a9520e377aaf',
          operation: 'executeUnifiedByAddress',
          args: [{ type: 'String', value: 'ok' }],
        },
      },
    }],
  });
  const disabled = buildRelayPayloadOptions({
    runtime: { relayRawEnabled: false },
    transactionBody: { rawTransaction: '0xdeadbeef' },
    signatures: [{
      kind: 'evm',
      metadata: {
        metaInvocation: {
          scriptHash: '5be915aea3ce85e4752d522632f0a9520e377aaf',
          operation: 'executeUnifiedByAddress',
          args: [{ type: 'String', value: 'ok' }],
        },
      },
    }],
  });

  assert.deepEqual(enabled, ['best', 'raw', 'meta']);
  assert.deepEqual(disabled, ['meta']);
  assert.equal(resolveRelayPayloadMode({ relayPayloadMode: 'best', availableModes: enabled }), 'raw');
  assert.equal(resolveRelayPayloadMode({ relayPayloadMode: 'meta', availableModes: enabled }), 'meta');
});

test('buildRelayBroadcastRequest uses stored meta invocations when raw transaction bytes are absent', () => {
  const request = buildRelayBroadcastRequest({
    relayEndpoint: '/api/relay-transaction',
    morpheusNetwork: 'testnet',
    relayPayloadMode: 'meta',
    transactionBody: {},
    signatures: [{
      signerId: 'evm:bob',
      kind: 'evm',
      metadata: {
        metaInvocation: {
          scriptHash: '5be915aea3ce85e4752d522632f0a9520e377aaf',
          operation: 'executeUnifiedByAddress',
          args: [{ type: 'String', value: 'ok' }],
        },
      },
    }],
  });

  assert.deepEqual(request, {
    relayEndpoint: '/api/relay-transaction',
    morpheus_network: 'testnet',
    metaInvocation: {
      scriptHash: '5be915aea3ce85e4752d522632f0a9520e377aaf',
      operation: 'executeUnifiedByAddress',
      args: [{ type: 'String', value: 'ok' }],
    },
  });
});


test('buildRelayBroadcastRequest rejects raw relay when raw forwarding is disabled', () => {
  assert.throws(
    () => buildRelayBroadcastRequest({
      relayEndpoint: '/api/relay-transaction',
      relayRawEnabled: false,
      transactionBody: { rawTransaction: '0xdeadbeef' },
    }),
    /raw relay forwarding is not enabled/i,
  );
});

test('buildRelayBroadcastRequest honors explicit meta selection when raw and meta payloads both exist', () => {
  const request = buildRelayBroadcastRequest({
    relayEndpoint: '/api/relay-transaction',
    morpheusNetwork: 'testnet',
    relayPayloadMode: 'meta',
    transactionBody: { rawTransaction: '0xdeadbeef' },
    signatures: [{
      signerId: 'evm:bob',
      kind: 'evm',
      metadata: {
        metaInvocation: {
          scriptHash: '5be915aea3ce85e4752d522632f0a9520e377aaf',
          operation: 'executeUnifiedByAddress',
          args: [{ type: 'String', value: 'ok' }],
        },
      },
    }],
  });

  assert.deepEqual(request, {
    relayEndpoint: '/api/relay-transaction',
    morpheus_network: 'testnet',
    metaInvocation: {
      scriptHash: '5be915aea3ce85e4752d522632f0a9520e377aaf',
      operation: 'executeUnifiedByAddress',
      args: [{ type: 'String', value: 'ok' }],
    },
  });
});

test('buildRelayBroadcastRequest forwards paymaster metadata when present', () => {
  const request = buildRelayBroadcastRequest({
    relayEndpoint: '/api/relay-transaction',
    morpheusNetwork: 'testnet',
    relayPayloadMode: 'meta',
    transactionBody: {
      paymaster: {
        account_id: 'aa-test',
        zerc20Proof: {
          public_inputs: { recipient: '0x' + '11'.repeat(20) },
        },
      },
    },
    signatures: [{
      signerId: 'evm:bob',
      kind: 'evm',
      metadata: {
        metaInvocation: {
          scriptHash: '5be915aea3ce85e4752d522632f0a9520e377aaf',
          operation: 'executeUserOp',
          args: [{ type: 'String', value: 'ok' }],
        },
      },
    }],
  });

  assert.deepEqual(request, {
    relayEndpoint: '/api/relay-transaction',
    morpheus_network: 'testnet',
    metaInvocation: {
      scriptHash: '5be915aea3ce85e4752d522632f0a9520e377aaf',
      operation: 'executeUserOp',
      args: [{ type: 'String', value: 'ok' }],
    },
    paymaster: {
      account_id: 'aa-test',
      zerc20Proof: {
        public_inputs: { recipient: '0x' + '11'.repeat(20) },
      },
    },
  });
});

test('buildRelayBroadcastRequest rejects missing signed raw transactions', () => {
  assert.throws(
    () => buildRelayBroadcastRequest({ relayEndpoint: '/api/relay-transaction', transactionBody: {} }),
    /signed raw transaction|meta invocation/i,
  );
});

test('wallet service exposes EVM connect and sign helpers', () => {
  const source = fs.readFileSync(path.resolve('src/services/walletService.js'), 'utf8');
  assert.match(source, /connectEvm/);
  assert.match(source, /signTypedDataWithEvm/);
  assert.match(source, /getAvailableWalletModes/);
  assert.match(source, /relayTransaction/);
});
