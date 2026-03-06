import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isBlockedNodeName,
  shouldStripAttribute
} from '../src/features/docs/rendering.js';

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
