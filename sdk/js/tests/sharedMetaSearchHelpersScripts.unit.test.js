const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const expectations = [
  'aa_testnet_full_validate.js',
  'aa_testnet_negative_meta_validate.js',
];

for (const file of expectations) {
  test(`${file} uses the shared meta search helper`, () => {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.match(source, /require\('\.\/metaSearch'\)/);
    assert.doesNotMatch(source, /for \(const candidateArgsHash/);
    assert.doesNotMatch(source, /for \(const candidatePubKey/);
  });
}
