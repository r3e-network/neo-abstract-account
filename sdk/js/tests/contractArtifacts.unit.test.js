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
