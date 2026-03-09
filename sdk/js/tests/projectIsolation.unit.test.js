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
  assert.match(source, /Compile Include="AbstractAccount\*\.cs"/);
  assert.match(source, /Compile Include="InternalsVisibleTo\.cs"/);
  assert.match(source, /Compile Include="TestECDSA\.cs"/);
});
