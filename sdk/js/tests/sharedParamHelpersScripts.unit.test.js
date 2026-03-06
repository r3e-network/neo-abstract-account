const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const expectations = [
  { file: 'aa_testnet_negative_meta_validate.js', mustNotMatch: [/^function cpHash160\(/m, /^function cpByteArray\(/m, /^function cpByteArrayRaw\(/m, /^function cpArray\(/m] },
  { file: 'aa_testnet_full_validate.js', mustNotMatch: [/^function cpHash160\(/m, /^function cpByteArray\(/m, /^function cpByteArrayRaw\(/m, /^function cpArray\(/m] },
  { file: 'aa_testnet_max_transfer_validate.js', mustNotMatch: [/^function cpHash160\(/m, /^function cpByteArray\(/m, /^function cpArray\(/m] },
  { file: 'aa_testnet_direct_proxy_spend_validate.js', mustNotMatch: [/^function cpHash160\(/m, /^function cpByteArray\(/m, /^function cpArray\(/m] },
];

for (const { file, mustNotMatch } of expectations) {
  test(`${file} uses the shared param helpers`, () => {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.match(source, /require\('\.\/params'\)/);
    for (const pattern of mustNotMatch) {
      assert.doesNotMatch(source, pattern);
    }
  });
}
