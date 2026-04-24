import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { MORPHEUS_PUBLIC_REGISTRY } from '../src/config/generatedMorpheusRegistry.js';
import { MORPHEUS_PUBLIC_RUNTIME_CATALOG } from '../src/config/generatedMorpheusRuntimeCatalog.js';

const frontendRoot = path.resolve(import.meta.dirname, '..');
const workspaceRoot = path.resolve(frontendRoot, '..', '..');
const oracleRoot = path.join(workspaceRoot, 'neo-morpheus-oracle');

async function loadCanonicalModule(moduleName, exportName) {
  const modulePath = path.join(oracleRoot, 'scripts', moduleName);
  const module = await import(pathToFileURL(modulePath).href);
  const loader = module[exportName];

  assert.equal(typeof loader, 'function');
  return loader({ oracleRoot });
}

test(
  'generated Morpheus public registry stays synchronized with the canonical oracle export',
  { skip: !fs.existsSync(oracleRoot) },
  async () => {
    const canonicalRegistry = await loadCanonicalModule(
      'lib-public-network-registry.mjs',
      'loadPublicNetworkRegistry'
    );
    assert.deepEqual(MORPHEUS_PUBLIC_REGISTRY, canonicalRegistry);
  }
);

test(
  'generated Morpheus runtime catalog stays synchronized with the canonical oracle export',
  { skip: !fs.existsSync(oracleRoot) },
  async () => {
    const canonicalCatalog = await loadCanonicalModule(
      'lib-public-runtime-catalog.mjs',
      'loadPublicRuntimeCatalog'
    );
    assert.deepEqual(MORPHEUS_PUBLIC_RUNTIME_CATALOG, canonicalCatalog);
  }
);
