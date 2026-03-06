const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { resolveContractArtifactPaths } = require('../src/contractArtifacts');

test('resolveContractArtifactPaths points to repo-root contracts/bin/sc artifacts', () => {
  const paths = resolveContractArtifactPaths({ fromDir: __dirname });

  assert.equal(
    paths.nefPath,
    path.resolve(__dirname, '../../../contracts/bin/sc/UnifiedSmartWalletV2.nef')
  );
  assert.equal(
    paths.manifestPath,
    path.resolve(__dirname, '../../../contracts/bin/sc/UnifiedSmartWalletV2.manifest.json')
  );
});
