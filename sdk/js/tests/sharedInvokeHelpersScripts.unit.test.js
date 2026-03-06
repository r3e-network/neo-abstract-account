const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const expectations = [
  'aa_testnet_integration_check.js',
  'aa_testnet_full_validate.js',
  'aa_testnet_negative_meta_validate.js',
  'aa_testnet_max_transfer_validate.js',
  'aa_testnet_direct_proxy_spend_validate.js',
];

for (const file of expectations) {
  test(`${file} uses the shared invocation helper`, () => {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.match(source, /require\('\.\/invoke'\)/);
    assert.doesNotMatch(source, /^async function sendInvocation\(/m);
  });
}
