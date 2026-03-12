const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const validatorPath = path.resolve(__dirname, 'aa_testnet_threshold2_validate.js');
const packageJsonPath = path.resolve(__dirname, '../package.json');

test('threshold-2 validator script exists', () => {
  assert.equal(fs.existsSync(validatorPath), true, 'expected dedicated threshold-2 validator script to exist');
});

test('threshold-2 validator uses shared helpers and proves mixed Neo + EVM execution', () => {
  const source = fs.readFileSync(validatorPath, 'utf8');

  assert.match(source, /require\('\.\/account'\)/);
  assert.match(source, /require\('\.\/rpc'\)/);
  assert.match(source, /require\('\.\/params'\)/);
  assert.match(source, /require\('\.\/invoke'\)/);
  assert.match(source, /require\('\.\/meta'\)/);
  assert.match(source, /require\('\.\/metaSearch'\)/);
  assert.match(source, /setSignersByAddress/);
  assert.match(source, /ContractParam\.integer\(2\)/);
  assert.match(source, /executeMetaTxByAddress/);
  assert.match(source, /executeByAddress/);
  assert.match(source, /method:\s*'getNonce'/);
  assert.match(source, /ethers\.Wallet\.createRandom\(\)/);

  assert.doesNotMatch(source, /^function randomAccountIdHex\(/m);
  assert.doesNotMatch(source, /^function deriveAaAddressFromId\(/m);
  assert.doesNotMatch(source, /^async function sendInvocation\(/m);
  assert.doesNotMatch(source, /^async function computeArgsHash\(/m);
});

test('threshold-2 validator is exposed via sdk package scripts', () => {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  assert.equal(
    packageJson.scripts['testnet:validate:threshold2'],
    'node tests/aa_testnet_threshold2_validate.js'
  );
});
