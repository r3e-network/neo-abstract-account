const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CONTRACT_MANAGEMENT_HASH,
  buildDeployScript,
  buildInvokeScriptQuery,
  buildSerializedDeployScript,
  scriptHexToBase64,
} = require('./deployHelpers');

test('deploy helper module exposes deploy query and script helpers', () => {
  assert.equal(typeof CONTRACT_MANAGEMENT_HASH, 'string');
  assert.equal(typeof scriptHexToBase64, 'function');
  assert.equal(typeof buildInvokeScriptQuery, 'function');
  assert.equal(typeof buildDeployScript, 'function');
  assert.equal(typeof buildSerializedDeployScript, 'function');
});

test('scriptHexToBase64 converts deploy script hex into base64', () => {
  assert.equal(scriptHexToBase64('deadbeef'), Buffer.from('deadbeef', 'hex').toString('base64'));
});

test('buildInvokeScriptQuery creates the expected invokescript rpc query', () => {
  const calls = [];
  const rpc = {
    Query: class Query {
      constructor(input) {
        calls.push(input);
        this.input = input;
      }
    },
  };

  const result = buildInvokeScriptQuery({
    rpc,
    scriptHex: 'deadbeef',
    accountScriptHash: '0x1234',
  });

  assert.deepEqual(calls, [{
    method: 'invokescript',
    params: [
      Buffer.from('deadbeef', 'hex').toString('base64'),
      [{ account: '0x1234', scopes: 'Global' }],
    ],
  }]);
  assert.deepEqual(result.input, calls[0]);
});

test('buildDeployScript creates the shared management deploy script', () => {
  const calls = [];
  const sc = {
    ContractParam: {
      byteArray(value) {
        calls.push(['byteArray', value]);
        return { type: 'ByteArray', value };
      },
      string(value) {
        calls.push(['string', value]);
        return { type: 'String', value };
      },
      any(value) {
        calls.push(['any', value]);
        return { type: 'Any', value };
      },
    },
    createScript(input) {
      calls.push(['createScript', input]);
      return 'script-hex';
    },
  };

  const result = buildDeployScript({
    sc,
    nefBase64: 'base64-nef',
    manifestString: '{"name":"wallet"}',
  });

  assert.equal(result, 'script-hex');
  assert.deepEqual(calls, [
    ['byteArray', 'base64-nef'],
    ['string', '{"name":"wallet"}'],
    ['any', null],
    ['createScript', {
      scriptHash: CONTRACT_MANAGEMENT_HASH,
      operation: 'deploy',
      args: [
        { type: 'ByteArray', value: 'base64-nef' },
        { type: 'String', value: '{"name":"wallet"}' },
        { type: 'Any', value: null },
      ],
    }],
  ]);
});

test('buildSerializedDeployScript emits the shared management deploy call through ScriptBuilder', () => {
  const calls = [];
  const sc = {
    ContractParam: {
      byteArray(value) {
        calls.push(['byteArray', value]);
        return { type: 'ByteArray', value };
      },
      string(value) {
        calls.push(['string', value]);
        return { type: 'String', value };
      },
      any(value) {
        calls.push(['any', value]);
        return { type: 'Any', value };
      },
    },
    ScriptBuilder: class ScriptBuilder {
      emitAppCall(scriptHash, operation, args) {
        calls.push(['emitAppCall', scriptHash, operation, args]);
      }
      build() {
        calls.push(['build']);
        return 'serialized-script';
      }
    },
  };
  const u = {
    HexString: {
      fromHex(value, littleEndian) {
        calls.push(['fromHex', value, littleEndian]);
        return `hex:${value}:${littleEndian}`;
      },
    },
  };

  const result = buildSerializedDeployScript({
    sc,
    u,
    nefHex: 'beef',
    manifestString: '{"name":"wallet"}',
  });

  assert.equal(result, 'serialized-script');
  assert.deepEqual(calls, [
    ['fromHex', 'beef', true],
    ['byteArray', 'hex:beef:true'],
    ['string', '{"name":"wallet"}'],
    ['any', null],
    ['emitAppCall', CONTRACT_MANAGEMENT_HASH.replace(/^0x/, ''), 'deploy', [
      { type: 'ByteArray', value: 'hex:beef:true' },
      { type: 'String', value: '{"name":"wallet"}' },
      { type: 'Any', value: null },
    ]],
    ['build'],
  ]);
});
