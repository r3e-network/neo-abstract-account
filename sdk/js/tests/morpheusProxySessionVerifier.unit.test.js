const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('Morpheus proxy session verifier exposes request, callback, and session authorization methods', () => {
  const source = read('contracts/recovery/MorpheusProxySessionVerifier.Fixed.cs');

  assert.match(source, /class\s+MorpheusProxySessionVerifier\s*:\s*Framework\.SmartContract/);
  assert.match(source, /public static void SetupProxySession\(/);
  assert.match(source, /public static BigInteger RequestActionSession\(/);
  assert.match(source, /public static void UpdateProxySessionConfig\(/);
  assert.match(source, /public static void SubmitActionTicket\(/);
  assert.match(source, /public static void OnOracleResult\(/);
  assert.match(source, /public static void RevokeActionSession\(/);
  assert.match(source, /public static bool Verify\(ByteString accountId\)/);
  assert.match(source, /public static bool VerifyMetaTx\(ByteString accountId, UInt160\[\] signerHashes\)/);
  assert.match(source, /neo_n3_action_v1/);
  assert.match(source, /neodid-action-v1/);
});

test('Morpheus proxy session verifier is part of the isolated recovery compile pipeline', () => {
  const compileScript = read('contracts/recovery/compile_recovery_contracts.sh');
  const project = read('contracts/recovery/MorpheusProxySessionVerifier.csproj');

  assert.match(compileScript, /compile_one MorpheusProxySessionVerifier MorpheusProxySessionVerifier\.Fixed\.cs/);
  assert.match(project, /EnableDefaultCompileItems>false<\/EnableDefaultCompileItems>/);
  assert.match(project, /<Compile Include="MorpheusProxySessionVerifier\.Fixed\.cs"/);
});
