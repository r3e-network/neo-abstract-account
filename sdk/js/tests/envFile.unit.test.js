const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { parseEnvFile } = require('./env');

test('parseEnvFile returns an empty object for a missing file', () => {
  const missingPath = path.join(os.tmpdir(), `neo-aa-missing-${Date.now()}.env`);
  assert.deepEqual(parseEnvFile(missingPath), {});
});

test('parseEnvFile reads key-value lines and ignores comments or invalid entries', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'neo-aa-env-'));
  const envPath = path.join(dir, '.env');

  fs.writeFileSync(envPath, [
    '# comment',
    ' VITE_AA_HASH_TESTNET = abc123 ',
    '',
    'INVALID_LINE',
    'TEST_WIF=super-secret',
  ].join('\n'));

  assert.deepEqual(parseEnvFile(envPath), {
    VITE_AA_HASH_TESTNET: 'abc123',
    TEST_WIF: 'super-secret',
  });
});


test('sdk/js ships an env example for live validation', () => {
  const examplePath = path.resolve(__dirname, '..', '.env.example');
  assert.equal(fs.existsSync(examplePath), true, 'expected sdk/js/.env.example to exist');

  const values = parseEnvFile(examplePath);
  assert.equal(values.TEST_WIF, 'replace-with-funded-testnet-wif');
  assert.equal(values.VITE_AA_HASH_TESTNET, 'replace-with-40-byte-aa-script-hash');
  assert.equal(values.EXPECT_PROXY_SPEND_BLOCKED, '1');
});
