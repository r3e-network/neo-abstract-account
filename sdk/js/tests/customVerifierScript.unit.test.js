const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const verifierProjectPath = path.resolve(__dirname, '../../..', 'verifiers/AllowAllVerifier/AllowAllVerifier.csproj');
const verifierSourcePath = path.resolve(__dirname, '../../..', 'verifiers/AllowAllVerifier/AllowAllVerifier.cs');
const validatorPath = path.resolve(__dirname, 'aa_testnet_custom_verifier_validate.js');
const packageJsonPath = path.resolve(__dirname, '../package.json');

test('custom verifier project exists and declares Neo smart contract dependencies', () => {
  assert.equal(fs.existsSync(verifierProjectPath), true, 'expected standalone verifier project to exist');
  const source = fs.readFileSync(verifierProjectPath, 'utf8');

  assert.match(source, /<TargetFramework>net10\.0<\/TargetFramework>/);
  assert.match(source, /Neo\.SmartContract\.Framework/);
});

test('custom verifier source exports verify(ByteString accountId)', () => {
  assert.equal(fs.existsSync(verifierSourcePath), true, 'expected standalone verifier source to exist');
  const source = fs.readFileSync(verifierSourcePath, 'utf8');

  assert.match(source, /class\s+AllowAllVerifier\s*:\s*SmartContract/);
  assert.match(source, /public\s+static\s+bool\s+Verify\s*\(\s*ByteString\s+accountId\s*\)/);
});

test('custom verifier validator exists and uses deploy plus invocation helpers', () => {
  assert.equal(fs.existsSync(validatorPath), true, 'expected dedicated custom verifier validator script to exist');
  const source = fs.readFileSync(validatorPath, 'utf8');

  assert.match(source, /require\('\.\/account'\)/);
  assert.match(source, /require\('\.\/rpc'\)/);
  assert.match(source, /require\('\.\/invoke'\)/);
  assert.match(source, /require\('\.\/tx'\)/);
  assert.match(source, /buildDeployScript|buildSerializedDeployScript/);
  assert.match(source, /manifest\.name/);
  assert.match(source, /setVerifierContractByAddress/);
  assert.match(source, /getVerifierContractByAddress/);
  assert.match(source, /normalizeReadByteString/);
  assert.match(source, /setWhitelistModeByAddress/);
  assert.match(source, /executeByAddress/);
  assert.match(source, /executeByAddress self getNonce via custom verifier/);
});

test('custom verifier validator is exposed via sdk package scripts', () => {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  assert.equal(
    packageJson.scripts['testnet:validate:custom-verifier'],
    'node tests/aa_testnet_custom_verifier_validate.js'
  );
});
