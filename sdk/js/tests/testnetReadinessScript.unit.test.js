const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const readinessPath = path.resolve(__dirname, 'testnet_readiness.js');
const packageJsonPath = path.resolve(__dirname, '../package.json');

test('testnet readiness script exists and checks getnep17balances before live validation', () => {
  assert.equal(fs.existsSync(readinessPath), true, 'expected testnet readiness script to exist');
  const source = fs.readFileSync(readinessPath, 'utf8');

  assert.match(source, /getnep17balances/);
  assert.match(source, /TEST_WIF is required/);
  assert.match(source, /No GAS balance detected/);
});

test('sdk package exposes the testnet readiness script', () => {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  assert.equal(packageJson.scripts['testnet:check:readiness'], 'node tests/testnet_readiness.js');
});
