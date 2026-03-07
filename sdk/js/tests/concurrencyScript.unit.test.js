const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const validatorPath = path.resolve(__dirname, 'aa_testnet_concurrency_validate.js');
const packageJsonPath = path.resolve(__dirname, '../package.json');

test('concurrency validator exists and uses shared helpers plus bounded parallelism', () => {
  assert.equal(fs.existsSync(validatorPath), true, 'expected dedicated concurrency validator script to exist');
  const source = fs.readFileSync(validatorPath, 'utf8');

  assert.match(source, /require\('\.\/env'\)/);
  assert.match(source, /require\('\.\/rpc'\)/);
  assert.match(source, /require\('\.\/params'\)/);
  assert.match(source, /require\('\.\/account'\)/);
  assert.match(source, /require\('\.\/invoke'\)/);
  assert.match(source, /require\('\.\/stack'\)/);
  assert.match(source, /require\('\.\/meta'\)/);
  assert.match(source, /require\('\.\/metaSearch'\)/);
  assert.match(source, /Promise\.all/);
  assert.match(source, /SIMULATION_COUNT|CONCURRENCY_COUNT/);
  assert.match(source, /executeByAddress/);
  assert.match(source, /executeMetaTxByAddress/);
  assert.match(source, /getNonceForAddress/);

  assert.doesNotMatch(source, /^function randomAccountIdHex\(/m);
  assert.doesNotMatch(source, /^async function sendInvocation\(/m);
});

test('concurrency validator is exposed via sdk package scripts', () => {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  assert.equal(
    packageJson.scripts['testnet:validate:concurrency'],
    'node tests/aa_testnet_concurrency_validate.js'
  );
});
