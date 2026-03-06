const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const helperPath = path.join(__dirname, 'test-evm-meta-tx.js');
const helperSource = fs.readFileSync(helperPath, 'utf8');

test('test-evm-meta-tx defaults to the verified hardened testnet hash', () => {
  assert.match(
    helperSource,
    /711c1899a3b7fa0e055ae0d17c9acfcd1bef6423/
  );
});
