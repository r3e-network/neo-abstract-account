#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = path.resolve(import.meta.dirname, '..');
const defaultOracleRoot = path.resolve(repoRoot, '..', 'neo-morpheus-oracle');
const oracleRoot = process.env.MORPHEUS_ORACLE_ROOT
  ? path.resolve(process.env.MORPHEUS_ORACLE_ROOT)
  : defaultOracleRoot;

// Confidential-envelope drift guard. The canonical client implementation
// lives in the oracle workspace; this repo vendors a browser copy in
// frontend/src/utils/morpheusEncryption.js. When the canonical file changes,
// its hash changes and this sync fails until the vendored copy is
// re-verified (sdk/js/tests/morpheus-envelope-roundtrip.unit.test.js) and
// the pin below is updated.
const CANONICAL_ENVELOPE_RELATIVE_PATH = 'packages/shared/src/confidential-envelope.js';
const CANONICAL_ENVELOPE_SHA256 =
  '508329d6f14974733d8f1ca5fb7d3ac6e9b1dc21820e3f12131098de4bb3e129';
const LOCAL_ENVELOPE_RELATIVE_PATH = 'frontend/src/utils/morpheusEncryption.js';

async function loadOracleModule(moduleName, exportName) {
  const modulePath = path.join(oracleRoot, 'scripts', moduleName);
  if (!fs.existsSync(modulePath)) {
    throw new Error(`Missing canonical module: ${modulePath}`);
  }

  const module = await import(pathToFileURL(modulePath).href);
  const loader = module[exportName];
  if (typeof loader !== 'function') {
    throw new Error(`Missing export ${exportName} in ${modulePath}`);
  }

  return loader({ oracleRoot });
}

// Dry-run mode (--dry-run flag or SYNC_DRY_RUN=1): verify parity and report
// what the regenerated exports would change without writing any files. Use it
// whenever the oracle workspace may be mid-change.
const DRY_RUN = process.argv.includes('--dry-run') || process.env.SYNC_DRY_RUN === '1';

function writeGeneratedJs(targetPath, exportName, value, commentLine) {
  const body = [
    '/* eslint-disable */',
    commentLine,
    '// Do not edit manually; re-export from the Morpheus canonical oracle workspace.',
    '',
    `export const ${exportName} = ${JSON.stringify(value, null, 2)};`,
    '',
  ].join('\n');

  if (!DRY_RUN) {
    fs.writeFileSync(targetPath, body, 'utf8');
    return;
  }

  const relativeTarget = path.relative(repoRoot, targetPath);
  const previous = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : null;
  if (previous === null) {
    console.log(`[dry-run] would create ${relativeTarget} (${body.length} bytes)`);
    return;
  }
  if (previous === body) {
    console.log(`[dry-run] unchanged: ${relativeTarget}`);
    return;
  }

  const previousLines = previous.split('\n');
  const nextLines = body.split('\n');
  const changed = [];
  for (let i = 0; i < Math.max(previousLines.length, nextLines.length); i += 1) {
    if (previousLines[i] !== nextLines[i]) {
      changed.push(`  line ${i + 1}:\n    - ${previousLines[i] ?? '<missing>'}\n    + ${nextLines[i] ?? '<missing>'}`);
    }
  }
  console.log(`[dry-run] would update ${relativeTarget}: ${changed.length} line(s) differ`);
  for (const line of changed.slice(0, 40)) {
    console.log(line);
  }
  if (changed.length > 40) {
    console.log(`  … and ${changed.length - 40} more differing line(s)`);
  }
}

async function assertConfidentialEnvelopeParity() {
  const canonicalPath = path.join(oracleRoot, CANONICAL_ENVELOPE_RELATIVE_PATH);
  if (!fs.existsSync(canonicalPath)) {
    throw new Error(`Missing canonical module: ${canonicalPath}`);
  }

  const canonicalSha256 = createHash('sha256').update(fs.readFileSync(canonicalPath)).digest('hex');
  if (canonicalSha256 !== CANONICAL_ENVELOPE_SHA256) {
    throw new Error(
      [
        `Canonical confidential envelope drift detected: ${canonicalPath}`,
        `expected sha256 ${CANONICAL_ENVELOPE_SHA256}`,
        `actual   sha256 ${canonicalSha256}`,
        `Re-verify ${LOCAL_ENVELOPE_RELATIVE_PATH} against the canonical implementation,`,
        'run `node --test tests/morpheus-envelope-roundtrip.unit.test.js` in sdk/js,',
        'then update CANONICAL_ENVELOPE_SHA256 in this script.',
      ].join('\n')
    );
  }

  const canonical = await import(pathToFileURL(canonicalPath).href);
  const localPath = path.join(repoRoot, LOCAL_ENVELOPE_RELATIVE_PATH);
  if (!fs.existsSync(localPath)) {
    throw new Error(`Missing vendored envelope copy: ${localPath}`);
  }
  const localSource = fs.readFileSync(localPath, 'utf8');
  const requiredPins = [
    { name: 'ENVELOPE_INFO', test: localSource.includes(canonical.CONFIDENTIAL_ENVELOPE_INFO) },
    {
      name: 'ENVELOPE_ALGORITHM',
      test: localSource.includes(canonical.CONFIDENTIAL_ENVELOPE_ALGORITHM),
    },
    {
      name: 'ENVELOPE_VERSION',
      test: new RegExp(
        `ENVELOPE_VERSION\\s*=\\s*${canonical.CONFIDENTIAL_ENVELOPE_VERSION}\\b`
      ).test(localSource),
    },
    {
      name: 'AES_GCM_TAG_LENGTH_BYTES',
      test: new RegExp(
        `AES_GCM_TAG_LENGTH_BYTES\\s*=\\s*${canonical.AES_GCM_TAG_LENGTH_BYTES}\\b`
      ).test(localSource),
    },
  ];
  const missing = requiredPins.filter((pin) => !pin.test).map((pin) => pin.name);
  if (missing.length > 0) {
    throw new Error(
      `Vendored envelope copy ${LOCAL_ENVELOPE_RELATIVE_PATH} drifted from canonical literals: ${missing.join(', ')}`
    );
  }
}

async function main() {
  await assertConfidentialEnvelopeParity();

  const registry = await loadOracleModule('lib-public-network-registry.mjs', 'loadPublicNetworkRegistry');
  const catalog = await loadOracleModule('lib-public-runtime-catalog.mjs', 'loadPublicRuntimeCatalog');

  writeGeneratedJs(
    path.join(repoRoot, 'frontend/src/config/generatedMorpheusRegistry.js'),
    'MORPHEUS_PUBLIC_REGISTRY',
    registry,
    '// Generated from neo-morpheus-oracle/scripts/export-public-network-registry.mjs.'
  );

  writeGeneratedJs(
    path.join(repoRoot, 'frontend/src/config/generatedMorpheusRuntimeCatalog.js'),
    'MORPHEUS_PUBLIC_RUNTIME_CATALOG',
    catalog,
    '// Generated from neo-morpheus-oracle/scripts/export-public-runtime-catalog.mjs.'
  );

  console.log(DRY_RUN
    ? `[dry-run] Verified Morpheus generated config against ${oracleRoot} (no files written)`
    : `Synced Morpheus generated config from ${oracleRoot}`);
  console.log('Confidential envelope parity verified against the canonical oracle module');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
