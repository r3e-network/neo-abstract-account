const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('main contract project does not glob-compile recovery intermediates', () => {
  const source = read('contracts/AbstractAccount.csproj');
  assert.match(source, /EnableDefaultCompileItems>false<\/EnableDefaultCompileItems>/);
  assert.match(source, /Compile Include="AbstractAccount\.cs"/);
  assert.match(source, /Compile Include="AbstractAccount\.MetaTx\.cs"/);
  assert.match(source, /Compile Remove="recovery\/\*\*\/\*\.cs"/);
  assert.match(source, /Compile Remove="\*\*\/obj\/\*\*\/\*\.cs"/);
  assert.match(source, /Compile Remove="\*\*\/bin\/\*\*\/\*\.cs"/);
  assert.match(source, /Compile Include="InternalsVisibleTo\.cs"/);
  assert.match(source, /Compile Include="TestECDSA\.cs"/);
});


test('repo verification uses isolated contract compilation helper', () => {
  const verifyScript = read('scripts/verify_repo.sh');
  const helper = read('contracts/compile_abstract_account.sh');

  assert.match(verifyScript, /bash contracts\/compile_abstract_account\.sh/);
  assert.match(helper, /AbstractAccount\.MetaTx\.cs/);
  assert.match(helper, /UnifiedSmartWalletV2/);
  assert.match(helper, /mktemp/);
});
