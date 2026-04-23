#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const defaultOracleRoot = path.resolve(repoRoot, '..', 'neo-morpheus-oracle');
const oracleRoot = process.env.MORPHEUS_ORACLE_ROOT
  ? path.resolve(process.env.MORPHEUS_ORACLE_ROOT)
  : defaultOracleRoot;

function runOracleExport(scriptName) {
  const scriptPath = path.join(oracleRoot, 'scripts', scriptName);
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Missing canonical export script: ${scriptPath}`);
  }

  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: oracleRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Failed to run ${scriptName}`);
  }

  return JSON.parse(result.stdout);
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

function main() {
  const registry = runOracleExport('export-public-network-registry.mjs');
  const catalog = runOracleExport('export-public-runtime-catalog.mjs');

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

main();
