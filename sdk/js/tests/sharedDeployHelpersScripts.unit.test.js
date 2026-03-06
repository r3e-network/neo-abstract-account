const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

for (const file of ['deploy.js', 'deploy_mainnet.js']) {
  test(`${file} uses the shared deploy helpers`, () => {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.match(source, /require\('\.\/deployHelpers'\)/);
    assert.match(source, /buildInvokeScriptQuery\(/);
    assert.doesNotMatch(source, /Buffer\.from\(script, 'hex'\)\.toString\('base64'\)/);
  });
}
