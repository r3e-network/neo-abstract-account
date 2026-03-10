import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const servicePath = path.resolve('src/services/contractLookupService.js');

test('contract lookup service targets documented n3index contract endpoints', () => {
  assert.equal(fs.existsSync(servicePath), true, 'expected src/services/contractLookupService.js to exist');
  const source = fs.readFileSync(servicePath, 'utf8');

  assert.match(source, /DEFAULT_N3INDEX_API_BASE_URL|n3IndexApiBaseUrl/);
  assert.match(source, /v_contract_overview/);
  assert.match(source, /v_account_contract_interactions/);
  assert.match(source, /\/rest\/v1\/contracts|buildContractManifestUrl/);
  assert.match(source, /resolveContractCandidates/);
  assert.match(source, /loadContractMethodsByHash/);
  assert.match(source, /searchContractsByName/);
  assert.match(source, /searchContractsByDomain/);
});

test('contract lookup service supports .matrix and .neo resolution paths', () => {
  const source = fs.readFileSync(servicePath, 'utf8');

  assert.match(source, /\.matrix/);
  assert.match(source, /\.neo/);
  assert.match(source, /resolveMatrixDomain/);
  assert.match(source, /resolveNeoDomain/);
});
