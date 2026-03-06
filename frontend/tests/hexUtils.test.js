import test from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeHex } from '../src/utils/hex.js';

test('sanitizeHex strips 0x prefixes and normalizes casing', () => {
  assert.equal(sanitizeHex('0xABCD'), 'abcd');
  assert.equal(sanitizeHex('abcd'), 'abcd');
  assert.equal(sanitizeHex(''), '');
});
