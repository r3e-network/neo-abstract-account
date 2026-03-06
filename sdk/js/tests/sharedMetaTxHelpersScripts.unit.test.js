const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const expectations = [
  {
    file: 'aa_testnet_full_validate.js',
    mustNotMatch: [/^async function computeArgsHash\(/m, /^function buildTypedData\(/m, /slice\(0, 128\)/],
  },
  {
    file: 'aa_testnet_negative_meta_validate.js',
    mustNotMatch: [/^async function computeArgsHash\(/m, /^function buildTypedData\(/m, /^function buildExecuteMetaTxByAddressArgs\(/m, /slice\(0, 128\)/],
  },
  {
    file: 'test-evm-meta-tx.js',
    mustNotMatch: [/buildMetaTransactionTypedData\(/m, /computeArgsHash returned empty stack/, /slice\(0, 128\)/],
  },
];

for (const { file, mustNotMatch } of expectations) {
  test(`${file} uses the shared meta-tx helpers`, () => {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.match(source, /require\('\.\/meta'\)/);
    for (const pattern of mustNotMatch) {
      assert.doesNotMatch(source, pattern);
    }
  });
}
