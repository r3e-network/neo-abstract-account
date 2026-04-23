#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendDir = path.join(rootDir, 'frontend');

const SEVERITY_RANK = new Map([
  ['info', 0],
  ['low', 1],
  ['moderate', 2],
  ['high', 3],
  ['critical', 4],
]);

const ALLOWED_BASELINE = new Map([
  ['@metamask/abi-utils', 'moderate'],
  ['@metamask/delegation-core', 'moderate'],
  ['@metamask/rpc-errors', 'moderate'],
  ['@metamask/sdk', 'moderate'],
  ['@metamask/sdk-communication-layer', 'moderate'],
  ['@metamask/smart-accounts-kit', 'moderate'],
  ['@metamask/utils', 'moderate'],
  ['@solana/web3.js', 'moderate'],
  ['@toruslabs/base-controllers', 'low'],
  ['@toruslabs/broadcast-channel', 'low'],
  ['@toruslabs/customauth', 'low'],
  ['@toruslabs/eccrypto', 'low'],
  ['@toruslabs/ethereum-controllers', 'moderate'],
  ['@toruslabs/metadata-helpers', 'low'],
  ['@toruslabs/secure-pub-sub', 'low'],
  ['@toruslabs/session-manager', 'low'],
  ['@toruslabs/starkware-crypto', 'low'],
  ['@toruslabs/torus.js', 'low'],
  ['@web3auth/auth', 'low'],
  ['@web3auth/modal', 'moderate'],
  ['@web3auth/no-modal', 'moderate'],
  ['@web3auth/ws-embed', 'low'],
  ['bip32', 'low'],
  ['elliptic', 'low'],
  ['jayson', 'moderate'],
  ['ripple-keypairs', 'low'],
  ['rpc-websockets', 'moderate'],
  ['tiny-secp256k1', 'low'],
  ['uuid', 'moderate'],
  ['xrpl', 'low'],
]);

function fail(message, detail = '') {
  console.error(`[frontend audit] ${message}`);
  if (detail) console.error(detail);
  process.exit(1);
}

const audit = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
  cwd: frontendDir,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

if (![0, 1].includes(audit.status ?? 1)) {
  fail('npm audit did not complete successfully.', audit.stderr || audit.stdout || '');
}

const rawReport = `${audit.stdout || ''}`.trim();
if (!rawReport) {
  fail('npm audit returned no JSON output.', audit.stderr || '');
}

let report;
try {
  report = JSON.parse(rawReport);
} catch (error) {
  fail('npm audit JSON could not be parsed.', error instanceof Error ? error.message : String(error));
}

const vulnerabilities = report?.vulnerabilities || {};
const counts = report?.metadata?.vulnerabilities || {};

if (Object.keys(vulnerabilities).length === 0) {
  console.log('[frontend audit] Clean: 0 production vulnerabilities reported.');
  process.exit(0);
}

const unexpected = [];
const aboveBaseline = [];

for (const [name, meta] of Object.entries(vulnerabilities)) {
  const severity = String(meta?.severity || '').toLowerCase();
  const allowedSeverity = ALLOWED_BASELINE.get(name);
  if (!allowedSeverity) {
    unexpected.push(`${name}:${severity || 'unknown'}`);
    continue;
  }
  if ((SEVERITY_RANK.get(severity) ?? Number.POSITIVE_INFINITY) > (SEVERITY_RANK.get(allowedSeverity) ?? -1)) {
    aboveBaseline.push(`${name}:${severity || 'unknown'} (allowed <= ${allowedSeverity})`);
  }
}

if ((counts.high || 0) > 0 || (counts.critical || 0) > 0) {
  aboveBaseline.push(
    `metadata(low=${counts.low || 0}, moderate=${counts.moderate || 0}, high=${counts.high || 0}, critical=${counts.critical || 0})`,
  );
}

if (aboveBaseline.length > 0) {
  fail('Found vulnerabilities above the accepted frontend audit baseline.', aboveBaseline.join('\n'));
}

if (unexpected.length > 0) {
  fail('Found vulnerabilities outside the accepted Web3Auth/Torus/MetaMask/Solana upstream chain.', unexpected.join('\n'));
}

const observed = Object.keys(vulnerabilities).sort().join(', ');
console.log(
  `[frontend audit] Accepted upstream-only frontend baseline preserved (${counts.low || 0} low, ${counts.moderate || 0} moderate, ${counts.high || 0} high, ${counts.critical || 0} critical / ${Object.keys(vulnerabilities).length} packages).`,
);
console.log(`[frontend audit] Observed packages: ${observed}`);
