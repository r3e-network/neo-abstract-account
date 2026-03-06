const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const extractFiles = [
  'aa_testnet_integration_check.js',
  'aa_testnet_update.js',
  'aa_testnet_direct_proxy_spend_validate.js',
  'deploy_testnet.js',
];

for (const file of extractFiles) {
  test(`${file} uses the shared extractVmState helper`, () => {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.match(source, /require\('\.\/tx'\)/);
    assert.match(source, /extractVmState\(/);
    assert.doesNotMatch(source, /String\([^\n]*vmstate[^\n]*toUpperCase\(/);
  });
}

const haltFiles = [
  'aa_testnet_full_validate.js',
  'aa_testnet_negative_meta_validate.js',
  'aa_testnet_max_transfer_validate.js',
];

for (const file of haltFiles) {
  test(`${file} uses the shared assertVmStateHalt helper`, () => {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.match(source, /require\('\.\/tx'\)/);
    assert.match(source, /require\('\.\/invoke'\)/);
    assert.match(source, /assertVmStateHalt\b/);
    assert.doesNotMatch(source, /if \(vmState !== 'HALT'\)/);
  });
}
