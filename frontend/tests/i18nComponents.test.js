import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const files = [
  'src/features/operations/components/LoadAccountPanel.vue',
  'src/features/operations/components/OperationComposerPanel.vue',
  'src/features/operations/components/SignatureWorkflowPanel.vue',
  'src/features/operations/components/BroadcastOptionsPanel.vue',
  'src/features/operations/components/RelayPreflightPanel.vue',
  'src/features/operations/components/ActivitySidebar.vue',
  'src/features/operations/components/HomeOperationsWorkspace.vue',
  'src/views/TransactionInfoView.vue',
  'src/features/studio/components/CreateAccountPanel.vue',
  'src/features/studio/components/ManageGovernancePanel.vue',
  'src/features/studio/components/PermissionsLimitsPanel.vue',
  'src/features/studio/components/StudioSidebar.vue',
];

test('major workspace and studio views opt into i18n', () => {
  for (const relativePath of files) {
    const source = fs.readFileSync(path.resolve(relativePath), 'utf8');
    assert.match(source, /useI18n/);
  }
});

test('language registry includes operations and studio translation keys', () => {
  const source = fs.readFileSync(path.resolve('src/i18n/index.js'), 'utf8');
  assert.match(source, /workspaceTitle:/);
  assert.match(source, /loadAccountTitle:/);
  assert.match(source, /broadcastOptionsTitle:/);
  assert.match(source, /signatureOnlyNotice:/);
  assert.match(source, /manageTitle:/);
  assert.match(source, /permissionsTitle:/);
});


test('studio panels that call t() bind it from useI18n', () => {
  const studioFiles = [
    'src/features/studio/components/CreateAccountPanel.vue',
    'src/features/studio/components/ManageGovernancePanel.vue',
    'src/features/studio/components/PermissionsLimitsPanel.vue',
    'src/features/studio/components/StudioSidebar.vue',
  ];

  for (const relativePath of studioFiles) {
    const source = fs.readFileSync(path.resolve(relativePath), 'utf8');
    assert.match(source, /const \{ t \} = useI18n\(\);/);
  }
});
