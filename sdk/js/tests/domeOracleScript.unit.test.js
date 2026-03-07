const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const validatorPath = path.resolve(__dirname, 'aa_testnet_dome_oracle_validate.js');
const packageJsonPath = path.resolve(__dirname, '../package.json');

test('dome oracle validator exists and uses shared helpers', () => {
  assert.equal(fs.existsSync(validatorPath), true, 'expected dedicated dome/oracle validator script to exist');
  const source = fs.readFileSync(validatorPath, 'utf8');

  assert.match(source, /require\('\.\/env'\)/);
  assert.match(source, /require\('\.\/rpc'\)/);
  assert.match(source, /require\('\.\/params'\)/);
  assert.match(source, /require\('\.\/account'\)/);
  assert.match(source, /require\('\.\/invoke'\)/);
  assert.match(source, /require\('\.\/stack'\)/);
  assert.match(source, /setDomeAccountsByAddress/);
  assert.match(source, /setDomeOracleByAddress/);
  assert.match(source, /requestDomeActivationByAddress/);
  assert.match(source, /isDomeOracleUnlocked/);
  assert.match(source, /getLastDomeOracleResponseCodeByAddress/);
  assert.match(source, /getLastDomeOracleResponseByAddress/);
  assert.match(source, /getLastDomeOracleResponseUrlByAddress/);
  assert.match(source, /getLastDomeOracleUrlMatchedByAddress/);
  assert.match(source, /getLastDomeOracleTruthAcceptedByAddress/);
  assert.match(source, /getLastDomeOracleUnlockAppliedByAddress/);
  assert.match(source, /executeByAddress/);
  assert.match(source, /DOME_ORACLE_URL/);
  assert.match(source, /DOME_ORACLE_FILTER/);
  assert.match(source, /api\.github\.com\/repos\/neo-project\/neo/);
  assert.match(source, /has_issues/);

  assert.doesNotMatch(source, /^function randomAccountIdHex\(/m);
  assert.doesNotMatch(source, /^async function sendInvocation\(/m);
});

test('dome oracle validator is exposed via sdk package scripts', () => {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  assert.equal(
    packageJson.scripts['testnet:validate:dome-oracle'],
    'node tests/aa_testnet_dome_oracle_validate.js'
  );
});
