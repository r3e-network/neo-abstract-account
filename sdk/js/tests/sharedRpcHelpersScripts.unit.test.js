const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const expectations = [
  { file: 'aa_testnet_integration_check.js', mustMatch: /require\('\.\/rpc'\)/, mustNotMatch: [/^async function invokeRead\(/m] },
  { file: 'aa_testnet_negative_meta_validate.js', mustMatch: /require\('\.\/rpc'\)/, mustNotMatch: [/^async function invokeRead\(/m, /^async function simulate\(/m] },
  { file: 'aa_testnet_full_validate.js', mustMatch: /require\('\.\/rpc'\)/, mustNotMatch: [/^async function invokeRead\(/m, /^async function simulate\(/m] },
  { file: 'aa_testnet_max_transfer_validate.js', mustMatch: /require\('\.\/rpc'\)/, mustNotMatch: [/^async function simulate\(/m] },
];

for (const { file, mustMatch, mustNotMatch } of expectations) {
  test(`${file} uses the shared rpc helpers`, () => {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.match(source, mustMatch);
    for (const pattern of mustNotMatch) {
      assert.doesNotMatch(source, pattern);
    }
  });
}
