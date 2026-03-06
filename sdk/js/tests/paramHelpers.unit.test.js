const test = require('node:test');
const assert = require('node:assert/strict');

const { bindParamHelpers } = require('./params');

test('cpHash160 sanitizes input before building a Hash160 param', () => {
  const calls = [];
  const helpers = bindParamHelpers({
    sanitizeHex(value) {
      calls.push(['sanitizeHex', value]);
      return 'abcd';
    },
    sc: {
      ContractParam: {
        hash160(value) {
          calls.push(['hash160', value]);
          return { type: 'Hash160', value };
        },
      },
    },
    u: {},
  });

  const result = helpers.cpHash160('0xABCD');
  assert.deepEqual(result, { type: 'Hash160', value: 'abcd' });
  assert.deepEqual(calls, [
    ['sanitizeHex', '0xABCD'],
    ['hash160', 'abcd'],
  ]);
});

test('cpByteArray and cpByteArrayRaw use different HexString byte-order flags', () => {
  const calls = [];
  const helpers = bindParamHelpers({
    sanitizeHex(value) {
      calls.push(['sanitizeHex', value]);
      return 'beef';
    },
    sc: {
      ContractParam: {
        byteArray(value) {
          calls.push(['byteArray', value]);
          return { type: 'ByteArray', value };
        },
      },
    },
    u: {
      HexString: {
        fromHex(value, littleEndian) {
          calls.push(['fromHex', value, littleEndian]);
          return `${value}:${littleEndian}`;
        },
      },
    },
  });

  assert.deepEqual(helpers.cpByteArray('0xBEEF'), { type: 'ByteArray', value: 'beef:false' });
  assert.deepEqual(helpers.cpByteArrayRaw('0xBEEF'), { type: 'ByteArray', value: 'beef:true' });
  assert.deepEqual(calls, [
    ['sanitizeHex', '0xBEEF'],
    ['fromHex', 'beef', false],
    ['byteArray', 'beef:false'],
    ['sanitizeHex', '0xBEEF'],
    ['fromHex', 'beef', true],
    ['byteArray', 'beef:true'],
  ]);
});

test('cpArray forwards items into ContractParam.array', () => {
  const calls = [];
  const helpers = bindParamHelpers({
    sanitizeHex: (value) => value,
    sc: {
      ContractParam: {
        array(...items) {
          calls.push(items);
          return { type: 'Array', value: items };
        },
      },
    },
    u: {},
  });

  const result = helpers.cpArray(['a', 'b']);
  assert.deepEqual(result, { type: 'Array', value: ['a', 'b'] });
  assert.deepEqual(calls, [['a', 'b']]);
});
