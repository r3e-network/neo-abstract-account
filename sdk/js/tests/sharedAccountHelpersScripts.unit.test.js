const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const expectations = [
  { file: 'aa_testnet_negative_meta_validate.js' },
  { file: 'aa_testnet_full_validate.js' },
  { file: 'aa_testnet_max_transfer_validate.js' },
  { file: 'aa_testnet_direct_proxy_spend_validate.js' },
];

for (const { file } of expectations) {
  test(`${file} uses the shared account helpers`, () => {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.match(source, /require\('\.\/account'\)/);
    assert.doesNotMatch(source, /^function randomAccountIdHex\(/m);
    assert.doesNotMatch(source, /^function deriveAaAddressFromId\(/m);
  });
}
