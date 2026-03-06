const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function loadDeployHelpers() {
  const modulePath = path.join(__dirname, 'deployHelpers.js');
  assert.equal(fs.existsSync(modulePath), true, 'expected shared deploy helper module to exist');
  return require('./deployHelpers');
}

test('deploy helper module exposes deploy query helpers', () => {
  const { scriptHexToBase64, buildInvokeScriptQuery } = loadDeployHelpers();
  assert.equal(typeof scriptHexToBase64, 'function');
  assert.equal(typeof buildInvokeScriptQuery, 'function');
});

test('scriptHexToBase64 converts deploy script hex into base64', () => {
  const { scriptHexToBase64 } = loadDeployHelpers();
  assert.equal(scriptHexToBase64('deadbeef'), Buffer.from('deadbeef', 'hex').toString('base64'));
});

test('buildInvokeScriptQuery creates the expected invokescript rpc query', () => {
  const calls = [];
  const { buildInvokeScriptQuery } = loadDeployHelpers();
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
