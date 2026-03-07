const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const scriptPath = path.resolve(__dirname, '../../../scripts/verify_repo.sh');
const ciPath = path.resolve(__dirname, '../../../.github/workflows/ci.yml');

test('root repo verification script exists and covers contract frontend and sdk checks', () => {
  assert.equal(fs.existsSync(scriptPath), true, 'expected scripts/verify_repo.sh to exist');
  const source = fs.readFileSync(scriptPath, 'utf8');
  assert.match(source, /dotnet build contracts\/AbstractAccount\.csproj -c Release -p:WarningsAsErrors=nullable -nologo/);
  assert.match(source, /~\/.dotnet\/tools\/nccs contracts\/AbstractAccount\.csproj -o contracts\/bin\/sc --base-name UnifiedSmartWalletV2 --assembly/);
  assert.match(source, /~\/.dotnet\/tools\/nccs verifiers\/AllowAllVerifier\/AllowAllVerifier\.csproj -o verifiers\/AllowAllVerifier\/bin\/sc --base-name AllowAllVerifier --assembly/);
  assert.match(source, /~\/.dotnet\/tools\/nccs tokens\/TestAllowanceToken\/TestAllowanceToken\.csproj -o tokens\/TestAllowanceToken\/bin\/sc --base-name TestAllowanceToken --assembly/);
  assert.match(source, /dotnet test neo-abstract-account\.sln -c Release --nologo/);
  assert.match(source, /cd frontend/);
  assert.match(source, /npm test/);
  assert.match(source, /npm run build/);
  assert.match(source, /npm audit --omit=dev/);
  assert.match(source, /cd (\.\.\/)?sdk\/js/);
});

test('CI workflow uses the root verification script', () => {
  assert.equal(fs.existsSync(ciPath), true, 'expected CI workflow to exist');
  const source = fs.readFileSync(ciPath, 'utf8');
  assert.match(source, /\.\/scripts\/verify_repo\.sh/);
});
