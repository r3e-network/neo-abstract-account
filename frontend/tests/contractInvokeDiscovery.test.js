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

test('home workspace treats N-prefixed input as an address only at the exact base58 length', () => {
  const source = fs.readFileSync(workspacePath, 'utf8');

  // Names like "NeoBurger" or "NEP17" must fall through to the N3Index name
  // search instead of throwing invalid-address errors on every keystroke.
  assert.match(source, /lookup\.startsWith\("N"\) && lookup\.length === 34/);
  assert.doesNotMatch(source, /lookup\.startsWith\("N"\) \|\|\n\s*isMatrixDomain/);

  // The direct-lookup branch is debounced like the name-search branch so
  // partially-typed hashes and addresses do not fire an RPC per keystroke.
  const directBranch = source.match(/if \(directLookup\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(directBranch, 'expected the directLookup branch in the targetContract watcher');
  assert.match(directBranch, /contractSuggestionTimer = setTimeout/);
  assert.match(directBranch, /refreshContractMethods\(lookup\)/);
});
