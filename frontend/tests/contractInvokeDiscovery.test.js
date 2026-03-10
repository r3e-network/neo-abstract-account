import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const lookupServicePath = path.resolve('src/services/contractLookupService.js');
const domainResolverPath = path.resolve('src/services/domainResolverService.js');
const composerPath = path.resolve('src/features/operations/components/OperationComposerPanel.vue');
const workspacePath = path.resolve('src/features/operations/components/HomeOperationsWorkspace.vue');

test('contract lookup service combines n3index name search with rpc abi loading', () => {
  assert.equal(fs.existsSync(lookupServicePath), true, 'expected src/services/contractLookupService.js to exist');
  const source = fs.readFileSync(lookupServicePath, 'utf8');

  assert.match(source, /contract_metadata_cache/);
  assert.match(source, /api\.n3index\.dev|n3IndexApiBaseUrl/);
  assert.match(source, /getcontractstate/);
  assert.match(source, /searchContractsByName/);
  assert.match(source, /loadContractManifest/);
});

test('domain resolver supports both .matrix and .neo identifiers for contract lookup', () => {
  assert.equal(fs.existsSync(domainResolverPath), true, 'expected src/services/domainResolverService.js to exist');
  const source = fs.readFileSync(domainResolverPath, 'utf8');

  assert.match(source, /\.matrix/);
  assert.match(source, /\.neo/);
  assert.match(source, /resolveMatrixDomain/);
  assert.match(source, /resolveNeoDomain/);
  assert.match(source, /resolveContractIdentifier/);
});

test('operation composer exposes contract suggestions method dropdown and parameter fields', () => {
  const source = fs.readFileSync(composerPath, 'utf8');

  assert.match(source, /contractSuggestions/);
  assert.match(source, /select-contract-suggestion|selectContractSuggestion/);
  assert.match(source, /methodOptions/);
  assert.match(source, /parameterFields/);
  assert.match(source, /update:parameterValue/);
});

test('home workspace wires contract lookup state into the invoke composer', () => {
  const source = fs.readFileSync(workspacePath, 'utf8');

  assert.match(source, /contractSuggestions/);
  assert.match(source, /methodOptions/);
  assert.match(source, /parameterFields/);
  assert.match(source, /selectContractSuggestion/);
  assert.match(source, /loadContractMethods|refreshContractMethods/);
});
