const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function loadStackModule() {
  const modulePath = path.join(__dirname, 'stack.js');
  assert.equal(fs.existsSync(modulePath), true, 'expected shared stack helper module to exist');
  return require('./stack');
}

test('stack helper module exposes decoder helpers', () => {
  const { bindStackHelpers, decodeByteStringToHex, decodeInteger } = loadStackModule();
  assert.equal(typeof bindStackHelpers, 'function');
  assert.equal(typeof decodeByteStringToHex, 'function');
  assert.equal(typeof decodeInteger, 'function');
});

test('decodeByteStringToHex decodes base64 byte strings to lowercase hex', () => {
  const { decodeByteStringToHex } = loadStackModule();
  assert.equal(
    decodeByteStringToHex({ type: 'ByteString', value: Buffer.from('A1B2', 'hex').toString('base64') }),
    'a1b2'
  );
  assert.equal(decodeByteStringToHex({ type: 'Integer', value: '1' }), '');
  assert.equal(decodeByteStringToHex(null), '');
});

test('decodeInteger returns parsed numbers and falls back to zero', () => {
  const { decodeInteger } = loadStackModule();
  assert.equal(decodeInteger({ value: '42' }), 42);
  assert.equal(decodeInteger({ value: 'NaN' }), 0);
  assert.equal(decodeInteger(undefined), 0);
});

test('bindStackHelpers exposes normalizeReadByteString using sanitizeHex and reverseHex', () => {
  const calls = [];
  const { bindStackHelpers } = loadStackModule();
  const helpers = bindStackHelpers({
    sanitizeHex(value) {
      calls.push(['sanitizeHex', value]);
      if (!value || value === '0x') return '';
      return value.replace(/^0x/i, '').toLowerCase();
    },
    u: {
      reverseHex(value) {
        calls.push(['reverseHex', value]);
        return value.match(/../g).reverse().join('');
      },
    },
  });

  assert.equal(helpers.normalizeReadByteString('0xA1B2'), 'b2a1');
  assert.equal(helpers.normalizeReadByteString('0x'), '');
  assert.deepEqual(calls, [
    ['sanitizeHex', '0xA1B2'],
    ['reverseHex', 'a1b2'],
    ['sanitizeHex', 'b2a1'],
    ['sanitizeHex', '0x'],
  ]);
});
