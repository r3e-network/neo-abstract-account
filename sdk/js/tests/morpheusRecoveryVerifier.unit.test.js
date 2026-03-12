const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const packageJsonPath = path.resolve(__dirname, '../package.json');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('Morpheus social recovery verifier source exposes the expected AA integration surface', () => {
  const source = read('contracts/recovery/MorpheusSocialRecoveryVerifier.Fixed.cs');

  assert.match(source, /class\s+MorpheusSocialRecoveryVerifier\s*:\s*Framework\.SmartContract/);
  assert.match(source, /public static void SetupRecovery\(/);
  assert.match(source, /public static void UpdateRecoveryConfig\(/);
  assert.match(source, /public static void SubmitRecoveryTicket\(/);
  assert.match(source, /public static BigInteger RequestActionSession\(/);
  assert.match(source, /public static void SubmitActionTicket\(/);
  assert.match(source, /public static void RevokeActionSession\(/);
  assert.match(source, /public static void FinalizeRecovery\(/);
  assert.match(source, /public static void CancelRecovery\(/);
  assert.match(source, /public static bool VerifyExecution\(ByteString accountId\)/);
  assert.match(source, /public static bool VerifyExecutionMetaTx\(ByteString accountId, UInt160\[\] signerHashes\)/);
  assert.match(source, /public static bool VerifyAdmin\(ByteString accountId\)/);
  assert.match(source, /public static bool VerifyAdminMetaTx\(ByteString accountId, UInt160\[\] signerHashes\)/);
  assert.match(source, /return VerifyExecution\(accountId\);/);
  assert.match(source, /return VerifyExecutionMetaTx\(accountId, signerHashes\);/);
  assert.match(source, /neodid-recovery-v1/);
  assert.match(source, /Invalid Morpheus recovery signature/);
  assert.match(source, /Action nullifier already used/);
});

test('Morpheus social recovery verifier build script includes isolated compilation', () => {
  const compileScript = read('contracts/recovery/compile_recovery_contracts.sh');
  const project = read('contracts/recovery/MorpheusSocialRecoveryVerifier.csproj');

  assert.match(compileScript, /compile_one MorpheusSocialRecoveryVerifier MorpheusSocialRecoveryVerifier\.Fixed\.cs/);
  assert.match(project, /EnableDefaultCompileItems>false<\/EnableDefaultCompileItems>/);
  assert.match(project, /<Compile Include="MorpheusSocialRecoveryVerifier\.Fixed\.cs"/);
});

test('AA execution and admin paths delegate to separate custom verifier entrypoints', () => {
  const source = read('contracts/AbstractAccount.Admin.cs');
  const executionSource = read('contracts/AbstractAccount.ExecutionAndPermissions.cs');

  assert.match(source, /UInt160 customVerifier = GetVerifierContract\(accountId\);/);
  assert.match(source, /"verifyAdmin"/);
  assert.match(source, /"verifyAdminMetaTx"/);
  assert.match(source, /Unauthorized by custom verifier/);
  assert.match(executionSource, /"verifyExecution"/);
  assert.match(executionSource, /"verifyExecutionMetaTx"/);
});

test('Morpheus verifier testnet validator exists and is exposed through sdk scripts', () => {
  const validatorPath = path.resolve(__dirname, 'aa_testnet_morpheus_verifier_validate.js');
  assert.equal(fs.existsSync(validatorPath), true, 'expected Morpheus verifier validator script to exist');
  const source = fs.readFileSync(validatorPath, 'utf8');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  assert.match(source, /deploy MorpheusSocialRecoveryVerifier/);
  assert.match(source, /setupRecovery/);
  assert.match(source, /setVerifierContractByAddress/);
  assert.match(source, /setAdminsByAddress/);
  assert.match(source, /getMorpheusOracle/);
  assert.equal(packageJson.scripts['testnet:validate:morpheus-verifier'], 'node tests/aa_testnet_morpheus_verifier_validate.js');
});
