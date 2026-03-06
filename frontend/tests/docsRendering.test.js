import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  isBlockedNodeName,
  shouldStripAttribute
} from '../src/features/docs/rendering.js';

const frontendRoot = path.resolve(import.meta.dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), 'utf8');

test('isBlockedNodeName blocks executable embedded tags', () => {
  assert.equal(isBlockedNodeName('script'), true);
  assert.equal(isBlockedNodeName('IFRAME'), true);
  assert.equal(isBlockedNodeName('object'), true);
  assert.equal(isBlockedNodeName('div'), false);
});

test('shouldStripAttribute removes inline handlers and javascript urls', () => {
  assert.equal(shouldStripAttribute('onclick', 'alert(1)'), true);
  assert.equal(shouldStripAttribute('href', 'javascript:alert(1)'), true);
  assert.equal(shouldStripAttribute('src', ' JAVASCRIPT:alert(1)'), true);
  assert.equal(shouldStripAttribute('href', 'https://example.com'), false);
  assert.equal(shouldStripAttribute('class', 'safe-class'), false);
});

test('docs registry uses the repo README as the overview source of truth', () => {
  const registrySource = read('src/features/docs/registry.js');
  assert.match(registrySource, /@repo\/README\.md\?raw/);
});

test('workflow doc explains wrapper execution after proxy hardening', () => {
  const workflowDoc = read('src/assets/docs/workflow.md');
  assert.match(workflowDoc, /executeByAddress/);
  assert.match(workflowDoc, /direct proxy-signed external/i);
});

test('sdk doc references the verified hardened testnet hash', () => {
  const sdkDoc = read('src/assets/docs/sdk-usage.md');
  assert.match(sdkDoc, /0x711c1899a3b7fa0e055ae0d17c9acfcd1bef6423/i);
});
