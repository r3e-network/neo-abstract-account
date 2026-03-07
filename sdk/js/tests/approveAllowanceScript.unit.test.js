const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const tokenProjectPath = path.resolve(__dirname, '../../..', 'tokens/TestAllowanceToken/TestAllowanceToken.csproj');
const tokenSourcePath = path.resolve(__dirname, '../../..', 'tokens/TestAllowanceToken/TestAllowanceToken.cs');
const validatorPath = path.resolve(__dirname, 'aa_testnet_approve_allowance_validate.js');
const packageJsonPath = path.resolve(__dirname, '../package.json');

test('approve token project exists and declares Neo smart contract dependency', () => {
  assert.equal(fs.existsSync(tokenProjectPath), true, 'expected standalone allowance token project to exist');
  const source = fs.readFileSync(tokenProjectPath, 'utf8');

  assert.match(source, /<TargetFramework>net10\.0<\/TargetFramework>/);
  assert.match(source, /Neo\.SmartContract\.Framework/);
});

test('approve token source exposes approval methods', () => {
  assert.equal(fs.existsSync(tokenSourcePath), true, 'expected standalone allowance token source to exist');
  const source = fs.readFileSync(tokenSourcePath, 'utf8');

  assert.match(source, /class\s+TestAllowanceToken\s*:\s*SmartContract/);
  assert.match(source, /public\s+static\s+bool\s+Approve\s*\(/);
  assert.match(source, /public\s+static\s+BigInteger\s+Allowance\s*\(/);
  assert.match(source, /public\s+static\s+BigInteger\s+BalanceOf\s*\(/);
});

test('approve allowance validator exists and uses deploy plus execution helpers', () => {
  assert.equal(fs.existsSync(validatorPath), true, 'expected dedicated approve/allowance validator script to exist');
  const source = fs.readFileSync(validatorPath, 'utf8');

  assert.match(source, /require\('\.\/env'\)/);
  assert.match(source, /require\('\.\/rpc'\)/);
  assert.match(source, /require\('\.\/params'\)/);
  assert.match(source, /require\('\.\/account'\)/);
  assert.match(source, /require\('\.\/invoke'\)/);
  assert.match(source, /require\('\.\/tx'\)/);
  assert.match(source, /buildDeployScript|buildSerializedDeployScript/);
  assert.match(source, /setMaxTransferByAddress/);
  assert.match(source, /executeByAddress/);
  assert.match(source, /allowance/);
  assert.match(source, /approve/);
});

test('approve allowance validator is exposed via sdk package scripts', () => {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  assert.equal(
    packageJson.scripts['testnet:validate:approve-allowance'],
    'node tests/aa_testnet_approve_allowance_validate.js'
  );
});
