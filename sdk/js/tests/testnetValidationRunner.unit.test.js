const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const runnerPath = path.resolve(__dirname, '..', 'run_testnet_validation_suite.sh');
const sdkJsDir = path.resolve(__dirname, '..');

function runRunner(args = [], extraEnv = {}) {
  return spawnSync('bash', [runnerPath, ...args], {
    cwd: sdkJsDir,
    env: {
      ...process.env,
      ...extraEnv,
    },
    encoding: 'utf8',
  });
}

test('testnet validation runner dry-run prints the scripts in safe order', () => {
  const result = runRunner(['--dry-run']);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const stdout = result.stdout;
  const expected = [
    'node tests/testnet_readiness.js',
    'node tests/test-evm-meta-tx.js',
    'node tests/aa_testnet_integration_check.js',
    'node tests/aa_testnet_negative_meta_validate.js',
    'node tests/aa_testnet_max_transfer_validate.js',
    'node tests/aa_testnet_approve_allowance_validate.js',
    'node tests/aa_testnet_direct_proxy_spend_validate.js',
    'node tests/aa_testnet_threshold2_validate.js',
    'node tests/aa_testnet_custom_verifier_validate.js',
    'node tests/aa_testnet_morpheus_verifier_validate.js',
    'node tests/aa_testnet_concurrency_validate.js',
    'node tests/aa_testnet_full_validate.js',
  ];

  for (const command of expected) {
    assert.match(stdout, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  const positions = expected.map((command) => stdout.indexOf(command));
  assert.deepEqual([...positions].sort((left, right) => left - right), positions);
});

test('testnet validation runner refuses a live run without required env', () => {
  const result = runRunner([], {
    TEST_WIF: '',
    AA_HASH_TESTNET: '',
    VITE_AA_HASH_TESTNET: '',
  });

  assert.notEqual(result.status, 0);
  assert.match(`${result.stderr}${result.stdout}`, /TEST_WIF/);
  assert.match(`${result.stderr}${result.stdout}`, /(AA_HASH_TESTNET|VITE_AA_HASH_TESTNET)/);
});
