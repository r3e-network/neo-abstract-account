import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const composableSource = fs.readFileSync(
  path.resolve('src/composables/useWalletConnection.js'),
  'utf8',
);
const workspaceSource = fs.readFileSync(
  path.resolve('src/features/operations/components/HomeOperationsWorkspace.vue'),
  'utf8',
);
const txViewSource = fs.readFileSync(
  path.resolve('src/views/TransactionInfoView.vue'),
  'utf8',
);

function extractFunction(source, name) {
  const match = source.match(
    new RegExp(`async function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`),
  );
  assert.ok(match, `expected async function ${name} in source`);
  return match[0];
}

test('useWalletConnection is the single owner of connect success and error toasts', () => {
  const connect = extractFunction(composableSource, 'connect');
  assert.match(connect, /toast\.success/);
  assert.match(connect, /toast\.error/);

  const connectEvm = extractFunction(composableSource, 'connectEvm');
  assert.match(connectEvm, /toast\.success/);
  assert.match(connectEvm, /toast\.error/);
});

test('home workspace connect wrappers do not stack a second toast per action', () => {
  const connectNeo = extractFunction(workspaceSource, 'connectNeoWallet');
  assert.doesNotMatch(connectNeo, /toast\.(success|error)/);

  const connectEvm = extractFunction(workspaceSource, 'connectEvmWalletAction');
  assert.doesNotMatch(connectEvm, /toast\.(success|error)/);
});

test('shared draft view connect wrappers do not stack a second error toast', () => {
  const connectNeo = extractFunction(txViewSource, 'connectNeoWallet');
  assert.doesNotMatch(connectNeo, /toast\.(success|error)/);

  const connectEvm = extractFunction(txViewSource, 'connectEvmWallet');
  assert.doesNotMatch(connectEvm, /toast\.(success|error)/);
});
