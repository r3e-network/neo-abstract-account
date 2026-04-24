#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = path.resolve(import.meta.dirname, '..');
const defaultOracleRoot = path.resolve(repoRoot, '..', 'neo-morpheus-oracle');
const oracleRoot = process.env.MORPHEUS_ORACLE_ROOT
  ? path.resolve(process.env.MORPHEUS_ORACLE_ROOT)
  : defaultOracleRoot;

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

function writeGeneratedJs(targetPath, exportName, value, commentLine) {
  const body = [
    '/* eslint-disable */',
    commentLine,
    '// Do not edit manually; re-export from the Morpheus canonical oracle workspace.',
    '',
    `export const ${exportName} = ${JSON.stringify(value, null, 2)};`,
    '',
  ].join('\n');

  fs.writeFileSync(targetPath, body, 'utf8');
}

async function main() {
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

  console.log(`Synced Morpheus generated config from ${oracleRoot}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
