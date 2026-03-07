const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const scriptPath = path.resolve(__dirname, '../../../scripts/verify_repo.sh');

test('root repo verification script exists and covers contract frontend and sdk checks', () => {
  assert.equal(fs.existsSync(scriptPath), true, 'expected scripts/verify_repo.sh to exist');
  const source = fs.readFileSync(scriptPath, 'utf8');
  assert.match(source, /dotnet build contracts\/AbstractAccount\.csproj -c Release -p:WarningsAsErrors=nullable -nologo/);
  assert.match(source, /dotnet test neo-abstract-account\.sln -c Release --nologo/);
  assert.match(source, /cd frontend/);
  assert.match(source, /npm test/);
  assert.match(source, /npm run build/);
  assert.match(source, /npm audit --omit=dev/);
  assert.match(source, /cd (\.\.\/)?sdk\/js/);
});
