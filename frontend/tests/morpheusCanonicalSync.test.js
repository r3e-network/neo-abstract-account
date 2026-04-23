import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { MORPHEUS_PUBLIC_REGISTRY } from '../src/config/generatedMorpheusRegistry.js';
import { MORPHEUS_PUBLIC_RUNTIME_CATALOG } from '../src/config/generatedMorpheusRuntimeCatalog.js';

const frontendRoot = path.resolve(import.meta.dirname, '..');
const workspaceRoot = path.resolve(frontendRoot, '..', '..');
const oracleRoot = path.join(workspaceRoot, 'neo-morpheus-oracle');

function runCanonicalExport(scriptName) {
  const scriptPath = path.join(oracleRoot, 'scripts', scriptName);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: oracleRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

test(
  'generated Morpheus public registry stays synchronized with the canonical oracle export',
  { skip: !fs.existsSync(oracleRoot) },
  () => {
    const canonicalRegistry = runCanonicalExport('export-public-network-registry.mjs');
    assert.deepEqual(MORPHEUS_PUBLIC_REGISTRY, canonicalRegistry);
  }
);

test(
  'generated Morpheus runtime catalog stays synchronized with the canonical oracle export',
  { skip: !fs.existsSync(oracleRoot) },
  () => {
    const canonicalCatalog = runCanonicalExport('export-public-runtime-catalog.mjs');
    assert.deepEqual(MORPHEUS_PUBLIC_RUNTIME_CATALOG, canonicalCatalog);
  }
);
