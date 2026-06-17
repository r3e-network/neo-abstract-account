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

test('permissions panel surfaces the value-uncapped session-key warning', () => {
  const source = fs.readFileSync(
    path.resolve('src/features/studio/components/PermissionsLimitsPanel.vue'),
    'utf8',
  );
  // The panel computes the warning from the shared, unit-tested scope analyzer and renders it.
  assert.match(source, /analyzeSessionKeyScope/);
  assert.match(source, /sessionKeyValueWarning/);
  assert.match(source, /studioPanels\.sessionKeyUncappedWarning/);
  assert.match(source, /studioPanels\.sessionKeyUncappedNativeWarning/);
});

test('both locales define the session-key value-uncapped warning keys', () => {
  const en = fs.readFileSync(path.resolve('src/i18n/index.js'), 'utf8');
  const zh = fs.readFileSync(path.resolve('src/i18n/zh-CN.js'), 'utf8');
  for (const source of [en, zh]) {
    assert.match(source, /sessionKeyUncappedWarning:/);
    assert.match(source, /sessionKeyUncappedNativeWarning:/);
    // The native-asset message must keep its {asset} interpolation placeholder.
    assert.match(source, /sessionKeyUncappedNativeWarning:[\s\S]{0,400}\{asset\}/);
  }
});
