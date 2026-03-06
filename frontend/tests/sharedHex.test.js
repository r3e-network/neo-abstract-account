import test from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeHex as runtimeSanitizeHex } from '../src/config/runtimeConfig.js';
import { sanitizeHex as studioSanitizeHex } from '../src/features/studio/helpers.js';

test('frontend modules reuse the same sanitizeHex implementation', () => {
  assert.equal(runtimeSanitizeHex('0xABCD'), 'abcd');
  assert.equal(studioSanitizeHex('0xABCD'), 'abcd');
  assert.strictEqual(runtimeSanitizeHex, studioSanitizeHex);
});
