const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const helperPath = path.join(__dirname, 'test-evm-meta-tx.js');
const helperSource = fs.readFileSync(helperPath, 'utf8');

test('test-evm-meta-tx defaults to the verified hardened testnet hash', () => {
  assert.match(
    helperSource,
    /5be915aea3ce85e4752d522632f0a9520e377aaf/
  );
});
