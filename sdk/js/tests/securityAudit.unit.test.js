const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function methodNames(manifestPath) {
  return new Set(readJson(manifestPath).abi.methods.map((entry) => entry.name));
}

test('recovery verifier artifacts expose both verify and verifyMetaTx for AA integration', () => {
  const manifests = [
    'contracts/recovery/compiled/ArgentRecoveryVerifier.manifest.json',
    'contracts/recovery/compiled/SafeRecoveryVerifier.manifest.json',
    'contracts/recovery/compiled/LoopringRecoveryVerifier.manifest.json',
  ];

  for (const manifest of manifests) {
    const methods = methodNames(manifest);
    assert.equal(methods.has('verify'), true, `${manifest} should expose verify`);
    assert.equal(methods.has('verifyMetaTx'), true, `${manifest} should expose verifyMetaTx`);
  }
});

test('recovery verifier source uses ByteString account ids at the wallet verifier boundary', () => {
  const files = [
    'contracts/recovery/ArgentRecoveryVerifier.Fixed.cs',
    'contracts/recovery/SafeRecoveryVerifier.Fixed.cs',
    'contracts/recovery/LoopringRecoveryVerifier.Fixed.cs',
  ];

  for (const file of files) {
    const source = read(file);
    assert.match(source, /public static bool Verify\(ByteString accountId\)/, `${file} should accept ByteString accountId in Verify`);
    assert.match(source, /public static bool VerifyMetaTx\(ByteString accountId, UInt160\[\] signerHashes\)/, `${file} should expose VerifyMetaTx for the AA wallet`);
  }
});

test('recovery setup paths require owner authorization and reject blind reinitialization', () => {
  const checks = [
    ['contracts/recovery/ArgentRecoveryVerifier.Fixed.cs', /Runtime\.CheckWitness\(owner\)/, /Recovery already setup|Already setup|already initialized/i],
    ['contracts/recovery/SafeRecoveryVerifier.Fixed.cs', /Runtime\.CheckWitness\(owner\)/, /Recovery already setup|Already setup|already initialized/i],
    ['contracts/recovery/LoopringRecoveryVerifier.Fixed.cs', /Runtime\.CheckWitness\(owner\)/, /Recovery already setup|Already setup|already initialized/i],
  ];

  for (const [file, ownerGate, reinitGuard] of checks) {
    const source = read(file);
    assert.match(source, ownerGate, `${file} should require owner witness during setup`);
    assert.match(source, reinitGuard, `${file} should reject blind reinitialization`);
  }
});

test('wallet deduplicates recovered meta-tx signers before custom verifier handoff', () => {
  const source = read('contracts/AbstractAccount.MetaTx.cs');
  assert.match(source, /Deduplicate.*signer/i, 'MetaTx path should deduplicate signer hashes');
});

test('admin mutation path delegates to custom verifier when configured', () => {
  const source = read('contracts/AbstractAccount.Admin.cs');
  assert.match(source, /GetVerifierContract\(accountId\)/);
  assert.match(source, /"verifySigner"/);
  assert.match(source, /"verifySignerMetaTx"/);
});

test('account creation does not silently inject tx sender into an explicitly provided admin set', () => {
  const source = read('contracts/AbstractAccount.StorageAndContext.cs');
  assert.doesNotMatch(source, /if \(!creatorExists\) finalAdmins\.Add\(creator\);/, 'creator should not always be silently appended to explicit admin lists');
});

test('proxy verification is restricted to explicit AA execution wrappers', () => {
  const source = read('contracts/AbstractAccount.StorageAndContext.cs');
  assert.match(source, /AllowedProxyVerificationMethods/, 'proxy verification should use an explicit allowlist');
  assert.match(source, /executeByAddress/, 'proxy verification should allow executeByAddress');
  assert.match(source, /executeMetaTxByAddress/, 'proxy verification should allow executeMetaTxByAddress');
  assert.match(source, /"executeMetaTx"/, 'proxy verification should allow executeMetaTx account-id path');
  assert.match(source, /"execute"/, 'proxy verification should allow execute account-id path');
});
