import test from 'node:test';
import assert from 'node:assert/strict';

import {
  OPERATION_PRESETS,
  buildOperationFromPreset,
  buildPresetSummary,
} from '../src/features/operations/presets.js';

test('preset registry exposes invoke, NEP-17 transfer, and multisig draft templates', () => {
  assert.deepEqual(
    OPERATION_PRESETS.map((item) => item.id),
    ['invoke', 'nep17Transfer', 'batchCreate', 'multisigDraft']
  );
});

test('NEP-17 transfer preset builds transfer args from the loaded abstract account', () => {
  const operation = buildOperationFromPreset({
    preset: 'nep17Transfer',
    account: { accountAddressScriptHash: '13ef519c362973f9a34648a9eac5b71250b2a80a' },
    transfer: {
      tokenScriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
      recipient: '0x49c095ce04d38642e39155f5481615c58227a498',
      amount: '100000000',
      data: '{"note":"ops"}',
    },
  });

  assert.equal(operation.kind, 'transfer');
  assert.equal(operation.targetContract, 'd2a4cff31913016155e38e474a2c06d08be276cf');
  assert.equal(operation.method, 'transfer');
  assert.deepEqual(operation.args, [
    { type: 'Hash160', value: '0x13ef519c362973f9a34648a9eac5b71250b2a80a' },
    { type: 'Hash160', value: '0x49c095ce04d38642e39155f5481615c58227a498' },
    { type: 'Integer', value: '100000000' },
    { type: 'Any', value: { note: 'ops' } },
  ]);
});

test('multisig preset keeps contract call data and marks the draft as multisig-oriented', () => {
  const operation = buildOperationFromPreset({
    preset: 'multisigDraft',
    invoke: {
      targetContract: '0x711c1899a3b7fa0e055ae0d17c9acfcd1bef6423',
      method: 'executeByAddress',
      argsText: '[{"type":"String","value":"hello"}]',
    },
    multisig: {
      title: 'Treasury payout',
      description: 'Needs two signers before relay',
    },
  });

  assert.equal(operation.kind, 'multisig');
  assert.equal(operation.method, 'executeByAddress');
  assert.equal(operation.metadata.title, 'Treasury payout');
  assert.equal(operation.metadata.description, 'Needs two signers before relay');
  assert.equal(operation.metadata.requiresAdditionalSigners, true);
});

test('preset summaries produce a compact user-facing description', () => {
  const summary = buildPresetSummary({
    kind: 'transfer',
    method: 'transfer',
    targetContract: 'd2a4cff31913016155e38e474a2c06d08be276cf',
    args: [
      { type: 'Hash160', value: '0x13ef519c362973f9a34648a9eac5b71250b2a80a' },
      { type: 'Hash160', value: '0x13ef519c362973f9a34648a9eac5b71250b2a80a' },
      { type: 'Integer', value: '100000000' },
    ],
  });

  assert.match(summary.title, /NEP-17 Transfer/i);
  assert.match(summary.detail, /100000000/);
});
