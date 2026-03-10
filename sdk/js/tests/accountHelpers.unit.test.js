const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');

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
    u: {},
    wallet: {},
    sanitizeHex: (value) => value,
  });

  assert.equal(randomAccountIdHex(16), '00112233445566778899aabbccddeeff');
  assert.deepEqual(calls, [16]);
});

test('deriveAaAddressFromId builds the raw-byte verify script and derived address', () => {
  const calls = [];
  const { bindAccountHelpers } = loadAccountModule();
  const { deriveAaAddressFromId } = bindAccountHelpers({
    crypto: { randomBytes() { throw new Error('not used'); } },
    u: {
      reverseHex(value) {
        calls.push(['reverseHex', value]);
        return '44332211';
      },
      hash160(script) {
        calls.push(['hash160', script]);
        return '0011223344556677';
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
      return String(value).replace(/^0x/i, '').toLowerCase();
    },
  });

  const result = deriveAaAddressFromId('0x11223344', '0xBEEF');
  assert.deepEqual(result, {
    verificationScript: '0c02beef11c01f0c067665726966790c144433221141627d5b52',
    addressScriptHash: '0011223344556677',
    signerScriptHash: '44332211',
    address: 'neo:0011223344556677',
  });
  assert.deepEqual(calls, [
    ['sanitizeHex', '0x11223344'],
    ['sanitizeHex', '0xBEEF'],
    ['reverseHex', '11223344'],
    ['sanitizeHex', '44332211'],
    ['hash160', '0c02beef11c01f0c067665726966790c144433221141627d5b52'],
    ['sanitizeHex', '0011223344556677'],
    ['reverseHex', '0011223344556677'],
    ['sanitizeHex', '44332211'],
    ['getAddressFromScriptHash', '0011223344556677'],
  ]);
});

test('deriveAaAddressFromId preserves raw accountId byte order in the verify script', () => {
  const { bindAccountHelpers } = loadAccountModule();
  const { deriveAaAddressFromId } = bindAccountHelpers({
    crypto: { randomBytes() { throw new Error('not used'); } },
    u: {
      reverseHex(value) {
        return value;
      },
      hash160(script) {
        return script;
      },
    },
    wallet: {
      getAddressFromScriptHash(value) {
        return value;
      },
    },
    sanitizeHex(value) {
      return String(value).replace(/^0x/i, '').toLowerCase();
    },
  });

  const result = deriveAaAddressFromId('aa55', '10203040');
  assert.match(result.verificationScript, /^0c0410203040/);
  assert.doesNotMatch(result.verificationScript, /^0c0440302010/);
});


test('sdk client source exposes account-address discovery helpers', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'index.js'), 'utf8');
  assert.match(source, /getAccountAddressesByAdmin/);
  assert.match(source, /getAccountAddressesByManager/);
});
