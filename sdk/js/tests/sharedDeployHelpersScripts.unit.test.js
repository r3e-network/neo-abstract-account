const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sharedCreateScriptFiles = ['deploy.js', 'deploy_mainnet.js'];
for (const file of sharedCreateScriptFiles) {
  test(`${file} uses shared deploy-script construction`, () => {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.match(source, /buildDeployScript\(/);
    assert.doesNotMatch(source, /const contractManagementHash =/);
    assert.doesNotMatch(source, /operation: 'deploy'/);
  });
}

test('deploy_testnet.js uses shared serialized deploy-script construction', () => {
  const source = fs.readFileSync(path.join(__dirname, 'deploy_testnet.js'), 'utf8');
  assert.match(source, /buildSerializedDeployScript\(/);
  assert.doesNotMatch(source, /const managementContractHash =/);
  assert.doesNotMatch(source, /emitAppCall\(/);
});
