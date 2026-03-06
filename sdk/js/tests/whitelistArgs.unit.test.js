const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function loadWhitelistArgsModule() {
  const modulePath = path.join(__dirname, 'whitelistArgs.js');
  assert.equal(fs.existsSync(modulePath), true, 'expected shared whitelist args helper module to exist');
  return require('./whitelistArgs');
}

function createHelpers() {
  const calls = [];
  const { bindWhitelistArgBuilders } = loadWhitelistArgsModule();
  const helpers = bindWhitelistArgBuilders({
    cpHash160(value) {
      calls.push(['cpHash160', value]);
      return `hash:${value}`;
    },
    cpByteArray(value) {
      calls.push(['cpByteArray', value]);
      return `bytes:${value}`;
    },
    cpByteArrayRaw(value) {
      calls.push(['cpByteArrayRaw', value]);
      return `raw:${value}`;
    },
    cpArray(items) {
      calls.push(['cpArray', items]);
      return { array: items };
    },
    sc: {
      ContractParam: {
        boolean(value) {
          calls.push(['boolean', value]);
          return `bool:${value}`;
        },
        integer(value) {
          calls.push(['integer', value]);
          return `int:${value}`;
        },
      },
    },
  });
  return { calls, helpers };
}

test('bindWhitelistArgBuilders exposes shared whitelist helper functions', () => {
  const { bindWhitelistArgBuilders } = loadWhitelistArgsModule();
  assert.equal(typeof bindWhitelistArgBuilders, 'function');

  const { helpers } = createHelpers();
  assert.equal(typeof helpers.buildSetWhitelistByAddressArgs, 'function');
  assert.equal(typeof helpers.buildSetWhitelistByAddressAlternativeBuilders, 'function');
  assert.equal(typeof helpers.buildSetWhitelistModeByAddressArgs, 'function');
  assert.equal(typeof helpers.buildSetWhitelistModeByAddressAlternativeBuilders, 'function');
  assert.equal(typeof helpers.buildSetWhitelistModeByAccountIdArgs, 'function');
  assert.equal(typeof helpers.buildSetWhitelistModeByAccountIdAlternativeBuilders, 'function');
});

test('buildSetWhitelistByAddressArgs uses hash160 plus boolean by default', () => {
  const { calls, helpers } = createHelpers();
  const args = helpers.buildSetWhitelistByAddressArgs('acct', 'target', true);

  assert.deepEqual(args, ['hash:acct', 'hash:target', 'bool:true']);
  assert.deepEqual(calls, [
    ['cpHash160', 'acct'],
    ['cpHash160', 'target'],
    ['boolean', true],
  ]);
});

test('buildSetWhitelistByAddressAlternativeBuilders covers raw, reversed, integer, and wrapped variants', () => {
  const { helpers } = createHelpers();
  const builders = helpers.buildSetWhitelistByAddressAlternativeBuilders('acct', 'target', true);
  assert.equal(builders.length, 8);

  assert.deepEqual(builders[0](), ['raw:acct', 'raw:target', 'bool:true']);
  assert.deepEqual(builders[1](), ['bytes:acct', 'bytes:target', 'bool:true']);
  assert.deepEqual(builders[2](), ['hash:acct', 'hash:target', 'int:1']);
  assert.deepEqual(builders[5](), [{ array: ['hash:acct', 'hash:target', 'bool:true'] }]);
  assert.deepEqual(builders[7](), [{ array: ['bytes:acct', 'bytes:target', 'bool:true'] }]);
});

test('buildSetWhitelistModeByAddressArgs uses hash160 plus boolean by default', () => {
  const { helpers } = createHelpers();
  assert.deepEqual(helpers.buildSetWhitelistModeByAddressArgs('acct', false), ['hash:acct', 'bool:false']);
});

test('buildSetWhitelistModeByAddressAlternativeBuilders preserves existing variant count and ordering', () => {
  const { helpers } = createHelpers();
  const builders = helpers.buildSetWhitelistModeByAddressAlternativeBuilders('acct', true);
  assert.equal(builders.length, 8);

  assert.deepEqual(builders[0](), ['raw:acct', 'bool:true']);
  assert.deepEqual(builders[1](), ['bytes:acct', 'bool:true']);
  assert.deepEqual(builders[2](), ['hash:acct', 'int:1']);
  assert.deepEqual(builders[5](), [{ array: ['hash:acct', 'bool:true'] }]);
});

test('buildSetWhitelistModeByAccountIdArgs uses byteArray plus boolean by default', () => {
  const { helpers } = createHelpers();
  assert.deepEqual(helpers.buildSetWhitelistModeByAccountIdArgs('acct-id', true), ['bytes:acct-id', 'bool:true']);
});

test('buildSetWhitelistModeByAccountIdAlternativeBuilders preserves raw and wrapped variants', () => {
  const { helpers } = createHelpers();
  const builders = helpers.buildSetWhitelistModeByAccountIdAlternativeBuilders('acct-id', false);
  assert.equal(builders.length, 4);

  assert.deepEqual(builders[0](), ['raw:acct-id', 'bool:false']);
  assert.deepEqual(builders[1](), ['bytes:acct-id', 'int:0']);
  assert.deepEqual(builders[2](), [{ array: ['bytes:acct-id', 'bool:false'] }]);
  assert.deepEqual(builders[3](), [{ array: ['raw:acct-id', 'bool:false'] }]);
});
