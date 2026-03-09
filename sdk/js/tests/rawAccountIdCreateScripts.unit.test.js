const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const files = [
  'aa_testnet_integration_check.js',
  'aa_testnet_negative_meta_validate.js',
  'aa_testnet_threshold2_validate.js',
  'aa_testnet_dome_oracle_validate.js',
  'aa_testnet_concurrency_validate.js',
  'aa_testnet_full_validate.js',
  'aa_testnet_max_transfer_validate.js',
  'aa_testnet_approve_allowance_validate.js',
  'aa_testnet_custom_verifier_validate.js',
  'aa_testnet_direct_proxy_spend_validate.js',
];

for (const file of files) {
  test(`${file} creates accounts with raw accountId bytes`, () => {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.match(source, /cpByteArrayRaw\(accountIdHex\)|cpByteArrayRaw\(accountId|fromHex\(accountId, true\)/);
  });
}
