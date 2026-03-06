const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const expectations = [
  {
    file: 'aa_testnet_negative_meta_validate.js',
    mustNotMatch: [/^function decodeInteger\(/m, /^function decodeByteStringToHex\(/m],
  },
  {
    file: 'aa_testnet_full_validate.js',
    mustNotMatch: [/^function decodeInteger\(/m, /^function decodeByteStringToHex\(/m, /^function normalizeReadByteString\(/m],
  },
  {
    file: 'aa_testnet_integration_check.js',
    mustNotMatch: [/^function toHexFromStackByteString\(/m],
  },
  {
    file: 'test-evm-meta-tx.js',
    mustNotMatch: [/Buffer\.from\(argsRes\.stack\[0\]\.value, 'base64'\)\.toString\('hex'\)/m],
  },
];

for (const { file, mustNotMatch } of expectations) {
  test(`${file} uses the shared stack helpers`, () => {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.match(source, /require\('\.\/stack'\)/);
    for (const pattern of mustNotMatch) {
      assert.doesNotMatch(source, pattern);
    }
  });
}
