const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { resolveContractArtifactPaths, readContractArtifacts } = require('../src/contractArtifacts');

test('resolveContractArtifactPaths points to repo-root contracts/bin/sc artifacts', () => {
  const paths = resolveContractArtifactPaths({ fromDir: __dirname });

  assert.equal(
    paths.nefPath,
    path.resolve(__dirname, '../../../contracts/bin/sc/UnifiedSmartWalletV2.nef')
  );
  assert.equal(
    paths.manifestPath,
    path.resolve(__dirname, '../../../contracts/bin/sc/UnifiedSmartWalletV2.manifest.json')
  );
});

test('readContractArtifacts returns both paths and loaded artifact contents', () => {
  assert.equal(typeof readContractArtifacts, 'function');

  const artifacts = readContractArtifacts({ fromDir: __dirname });
  assert.equal(
    artifacts.nefPath,
    path.resolve(__dirname, '../../../contracts/bin/sc/UnifiedSmartWalletV2.nef')
  );
  assert.equal(
    artifacts.manifestPath,
    path.resolve(__dirname, '../../../contracts/bin/sc/UnifiedSmartWalletV2.manifest.json')
  );
  assert.equal(Buffer.isBuffer(artifacts.nefBytes), true);
  assert.equal(artifacts.nefBytes.length > 0, true);
  assert.equal(artifacts.nefBase64, artifacts.nefBytes.toString('base64'));
  assert.equal(typeof artifacts.manifestString, 'string');
  assert.equal(artifacts.manifestString.length > 0, true);
});

test('sdk package.json includes publish metadata and runtime constraints', () => {
  const packageJsonPath = path.resolve(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  assert.equal(typeof packageJson.license, 'string');
  assert.equal(typeof packageJson.repository, 'object');
  assert.equal(typeof packageJson.homepage, 'string');
  assert.equal(typeof packageJson.engines, 'object');
  assert.equal(typeof packageJson.engines.node, 'string');
});

test('sdk package.json exposes testnet validation runner scripts', () => {
  const packageJsonPath = path.resolve(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  assert.equal(packageJson.scripts['testnet:validate'], 'bash ./run_testnet_validation_suite.sh');
  assert.equal(packageJson.scripts['testnet:validate:dry-run'], 'bash ./run_testnet_validation_suite.sh --dry-run');
});


test('ContractPermission attribute includes custom verifier verify permission', () => {
  const contractSourcePath = path.resolve(__dirname, '../../../contracts/AbstractAccount.cs');
  const contractSource = fs.readFileSync(contractSourcePath, 'utf8');

  assert.match(contractSource, /\[ContractPermission\([\s\S]*"verify"[\s\S]*\)\]/);
});


test('Oracle.Request uses the compiled dome activation callback name', () => {
  const contractSourcePath = path.resolve(__dirname, '../../../contracts/AbstractAccount.Oracle.cs');
  const contractSource = fs.readFileSync(contractSourcePath, 'utf8');

  assert.match(contractSource, /Oracle\.Request\([^\n]*"domeActivationCallback"/);
});


test('Oracle.Request uses parsed dome oracle filters', () => {
  const contractSourcePath = path.resolve(__dirname, '../../../contracts/AbstractAccount.Oracle.cs');
  const contractSource = fs.readFileSync(contractSourcePath, 'utf8');

  assert.match(contractSource, /ExtractDomeOracleFilter/);
  assert.match(contractSource, /Oracle\.Request\(requestUrl, requestFilter, "domeActivationCallback"/);
});


test('Dome oracle truth parser accepts quoted and single-byte truthy values', () => {
  const contractSourcePath = path.resolve(__dirname, '../../../contracts/AbstractAccount.Oracle.cs');
  const contractSource = fs.readFileSync(contractSourcePath, 'utf8');

  assert.equal(contractSource.includes("value == 1 || value == (byte)'1'"), true);
  assert.equal(contractSource.includes(
    `result[left] == (byte)'"'`
  ), true);
  assert.equal(contractSource.includes(
    `result[right] == (byte)'"'`
  ), true);
});


test('Dome oracle callback diagnostics are exposed', () => {
  const contractSourcePath = path.resolve(__dirname, '../../../contracts/AbstractAccount.Oracle.cs');
  const contractSource = fs.readFileSync(contractSourcePath, 'utf8');

  assert.match(contractSource, /GetLastDomeOracleResponseCode/);
  assert.match(contractSource, /GetLastDomeOracleResponseByAddress/);
  assert.match(contractSource, /GetLastDomeOracleResponseUrl/);
});


test('Dome oracle truth parser accepts single-element truthy arrays', () => {
  const contractSourcePath = path.resolve(__dirname, '../../../contracts/AbstractAccount.Oracle.cs');
  const contractSource = fs.readFileSync(contractSourcePath, 'utf8');

  assert.equal(contractSource.includes("result[left] == (byte)'['"), true);
  assert.equal(contractSource.includes("result[right] == (byte)']'"), true);
});


test('Dome oracle callback branch diagnostics are exposed', () => {
  const contractSourcePath = path.resolve(__dirname, '../../../contracts/AbstractAccount.Oracle.cs');
  const contractSource = fs.readFileSync(contractSourcePath, 'utf8');

  assert.match(contractSource, /GetLastDomeOracleUrlMatched/);
  assert.match(contractSource, /GetLastDomeOracleTruthAccepted/);
  assert.match(contractSource, /GetLastDomeOracleUnlockApplied/);
});


test('Dome oracle callback stores expected and configured URLs', () => {
  const contractSourcePath = path.resolve(__dirname, '../../../contracts/AbstractAccount.Oracle.cs');
  const contractSource = fs.readFileSync(contractSourcePath, 'utf8');

  assert.match(contractSource, /GetLastDomeOracleExpectedUrl/);
  assert.match(contractSource, /GetLastDomeOracleConfiguredUrl/);
});


test('Dome oracle callback uses deterministic string comparison', () => {
  const contractSourcePath = path.resolve(__dirname, '../../../contracts/AbstractAccount.Oracle.cs');
  const contractSource = fs.readFileSync(contractSourcePath, 'utf8');

  assert.equal(contractSource.includes('StringContentEquals'), true);
  assert.equal(contractSource.includes('StringContentEquals(configuredUrl, expectedUrl)'), true);
  assert.equal(contractSource.includes('StringContentEquals(configuredUrl, url)'), true);
});
