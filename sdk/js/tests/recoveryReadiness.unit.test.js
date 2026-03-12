const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('recovery verifier projects compile only the fixed contract source per project', () => {
  const argent = read('contracts/recovery/ArgentRecoveryVerifier.csproj');
  const safe = read('contracts/recovery/SafeRecoveryVerifier.csproj');
  const loopring = read('contracts/recovery/LoopringRecoveryVerifier.csproj');
  const morpheus = read('contracts/recovery/MorpheusSocialRecoveryVerifier.csproj');
  const morpheusProxy = read('contracts/recovery/MorpheusProxySessionVerifier.csproj');

  for (const [name, source, expectedFile] of [
    ['Argent', argent, 'ArgentRecoveryVerifier.Fixed.cs'],
    ['Safe', safe, 'SafeRecoveryVerifier.Fixed.cs'],
    ['Loopring', loopring, 'LoopringRecoveryVerifier.Fixed.cs'],
    ['Morpheus', morpheus, 'MorpheusSocialRecoveryVerifier.Fixed.cs'],
    ['MorpheusProxy', morpheusProxy, 'MorpheusProxySessionVerifier.Fixed.cs'],
  ]) {
    assert.match(source, /EnableDefaultCompileItems>false<\/EnableDefaultCompileItems>/, `${name} project should disable default compile globbing`);
    assert.match(source, new RegExp(`<Compile Include="${expectedFile.replace('.', '\\.')}" ?\/>`), `${name} project should compile only ${expectedFile}`);
  }
});

test('recovery setup methods are not marked safe in source docs/manifests', () => {
  const argent = read('contracts/recovery/ArgentRecoveryVerifier.Fixed.cs');
  const safe = read('contracts/recovery/SafeRecoveryVerifier.Fixed.cs');
  const loopring = read('contracts/recovery/LoopringRecoveryVerifier.Fixed.cs');
  const morpheus = read('contracts/recovery/MorpheusSocialRecoveryVerifier.Fixed.cs');

  assert.doesNotMatch(argent, /\[Safe\]\s*public static void SetupRecovery/);
  assert.doesNotMatch(safe, /\[Safe\]\s*public static void SetupRecovery/);
  assert.doesNotMatch(loopring, /\[Safe\]\s*public static void SetupRecovery/);
  assert.doesNotMatch(morpheus, /\[Safe\]\s*public static void SetupRecovery/);
});

test('official recovery testnet validator uses hash160 account ids for Argent flow', () => {
  const source = read('sdk/js/tests/recovery_testnet_validate.js');
  assert.match(source, /new wallet\.Account\(\)\.scriptHash/);
  assert.match(source, /ContractParam\.hash160\(accountId\)/);
  assert.doesNotMatch(source, /ContractParam\.byteArray\(u\.HexString\.fromHex\(accountId, true\)\)/);
});

test('sdk package exposes official safe and loopring recovery validators', () => {
  const packageJson = JSON.parse(read('sdk/js/package.json'));
  assert.equal(packageJson.scripts['testnet:validate:recovery:safe'], 'node tests/recovery_testnet_validate_safe.js');
  assert.equal(packageJson.scripts['testnet:validate:recovery:loopring'], 'node tests/recovery_testnet_validate_loopring.js');

  const safeSource = read('sdk/js/tests/recovery_testnet_validate_safe.js');
  const loopringSource = read('sdk/js/tests/recovery_testnet_validate_loopring.js');
  const helperSource = read('sdk/js/tests/recovery_validation_common.js');

  assert.match(safeSource, /SAFE_RECOVERY_HASH_TESTNET/);
  assert.match(loopringSource, /LOOPRING_RECOVERY_HASH_TESTNET/);
  assert.match(helperSource, /operation: 'setupRecovery'/);
});

test('recovery deployment docs and scripts do not embed a plaintext WIF', () => {
  const files = [
    'contracts/recovery/README.md',
    'contracts/recovery/PRE_DEPLOYMENT_CHECKLIST.md',
    'contracts/recovery/READY.md',
    'scripts/test_recovery_testnet.sh',
  ];

  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /Kx[1-9A-HJ-NP-Za-km-z]{50,}/, `${file} should not contain a real WIF`);
    assert.match(source, /TEST_WIF|your-wif|<your-wif>/i, `${file} should document placeholder or env-var based WIF usage`);
  }
});
