import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = path.join(frontendRoot, '..');

function readRepo(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('repo README describes the current frontend audit baseline honestly', () => {
  const readme = readRepo('README.md');

  assert.match(readme, /0 high\/critical production vulnerabilities/i);
  assert.match(readme, /frontend and JavaScript SDK/i);
  assert.match(readme, /reviewed low\/moderate package families/i);
  assert.match(readme, /Web3Auth\/Torus\/MetaMask\/Solana dependency chain/i);
  assert.match(readme, /SDK runs a separate production-only audit/i);
  assert.doesNotMatch(readme, /0 known production vulnerabilities/i);
});

test('repo verifier enforces the frontend audit allowlist guard', () => {
  const verifyScript = readRepo('scripts/verify_repo.sh');
  const auditGuard = readRepo('scripts/check_frontend_audit_allowlist.mjs');
  const frontendPackage = JSON.parse(readRepo('frontend/package.json'));

  assert.match(verifyScript, /npm run audit:prod/);
  assert.equal(
    frontendPackage.scripts['audit:prod'],
    'node ../scripts/check_frontend_audit_allowlist.mjs',
  );
  assert.match(auditGuard, /ALLOWED_BASELINE/);
  assert.match(auditGuard, /@web3auth\/modal/);
  assert.match(auditGuard, /@metamask\/sdk/);
  assert.match(auditGuard, /@solana\/web3\.js/);
  assert.match(auditGuard, /uuid/);
  assert.match(auditGuard, /elliptic/);
});

test('repo README documents the local verification entrypoint explicitly', () => {
  const readme = readRepo('README.md');
  const verifyScript = readRepo('scripts/verify_repo.sh');

  assert.match(readme, /preferred local verification entrypoint/i);
  assert.match(readme, /\.\/scripts\/verify_repo\.sh/);
  assert.match(verifyScript, /dotnet build contracts\/UnifiedSmartWallet\.csproj/);
  assert.match(verifyScript, /npm run audit:prod/);
  assert.match(verifyScript, /npm run types:check/);
  assert.match(verifyScript, /test:e2e:browser:built/);
});
