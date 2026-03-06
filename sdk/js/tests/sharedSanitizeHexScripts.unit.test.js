const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const scriptFiles = [
  'aa_testnet_integration_check.js',
  'aa_testnet_update.js',
  'aa_testnet_negative_meta_validate.js',
  'aa_testnet_max_transfer_validate.js',
  'aa_testnet_full_validate.js',
  'aa_testnet_direct_proxy_spend_validate.js',
  'test-evm-meta-tx.js',
];

for (const file of scriptFiles) {
  test(`${file} uses the shared SDK sanitizeHex helper`, () => {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.doesNotMatch(source, /^function sanitizeHex\(/m);
    assert.match(source, /require\('\.\.\/src\/metaTx'\)/);
  });
}
