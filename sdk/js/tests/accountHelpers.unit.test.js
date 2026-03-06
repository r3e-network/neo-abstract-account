const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function loadAccountModule() {
  const modulePath = path.join(__dirname, 'account.js');
  assert.equal(fs.existsSync(modulePath), true, 'expected shared account helper module to exist');
  return require('./account');
}

test('bindAccountHelpers exposes shared account helper functions', () => {
  const { bindAccountHelpers } = loadAccountModule();
  assert.equal(typeof bindAccountHelpers, 'function');
});

test('randomAccountIdHex uses crypto.randomBytes and hex encoding', () => {
  const { bindAccountHelpers } = loadAccountModule();
  const calls = [];
  const { randomAccountIdHex } = bindAccountHelpers({
    crypto: {
      randomBytes(size) {
        calls.push(size);
        return Buffer.from('00112233445566778899aabbccddeeff', 'hex');
      },
    },
    sc: {},
    u: {},
    wallet: {},
    sanitizeHex: (value) => value,
    cpByteArray: (value) => value,
  });

  assert.equal(randomAccountIdHex(16), '00112233445566778899aabbccddeeff');
  assert.deepEqual(calls, [16]);
});

test('deriveAaAddressFromId builds the verify script and derived address', () => {
  const calls = [];
  const { bindAccountHelpers } = loadAccountModule();
  const { deriveAaAddressFromId } = bindAccountHelpers({
    crypto: { randomBytes() { throw new Error('not used'); } },
    sc: {
      createScript(input) {
        calls.push(['createScript', input]);
        return 'verify-script';
      },
    },
    u: {
      hash160(script) {
        calls.push(['hash160', script]);
        return '0123456789abcdef';
      },
      reverseHex(value) {
        calls.push(['reverseHex', value]);
        return 'fedcba9876543210';
      },
    },
    wallet: {
      getAddressFromScriptHash(value) {
        calls.push(['getAddressFromScriptHash', value]);
        return `neo:${value}`;
      },
    },
    sanitizeHex(value) {
      calls.push(['sanitizeHex', value]);
      return `clean:${value}`;
    },
    cpByteArray(value) {
      calls.push(['cpByteArray', value]);
      return `bytes:${value}`;
    },
  });

  const result = deriveAaAddressFromId('aa-hash', 'beef');
  assert.deepEqual(result, {
    verificationScript: 'verify-script',
    addressScriptHash: 'clean:fedcba9876543210',
    address: 'neo:clean:fedcba9876543210',
  });
  assert.deepEqual(calls, [
    ['cpByteArray', 'beef'],
    ['createScript', { scriptHash: 'aa-hash', operation: 'verify', args: ['bytes:beef'] }],
    ['hash160', 'verify-script'],
    ['reverseHex', '0123456789abcdef'],
    ['sanitizeHex', 'fedcba9876543210'],
    ['getAddressFromScriptHash', 'clean:fedcba9876543210'],
  ]);
});
