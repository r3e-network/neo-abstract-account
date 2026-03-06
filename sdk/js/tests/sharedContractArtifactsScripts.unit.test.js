const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

for (const file of ['deploy.js', 'deploy_mainnet.js', 'deploy_testnet.js', 'aa_testnet_update.js']) {
  test(`${file} uses the shared contract artifact loader`, () => {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.match(source, /readContractArtifacts/);
    assert.doesNotMatch(source, /fs\.readFileSync\(nefPath\)/);
    assert.doesNotMatch(source, /fs\.readFileSync\(manifestPath/);
  });
}
