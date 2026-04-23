const test = require('node:test');
const assert = require('node:assert/strict');

const { resolvePhalaCliCommand, splitCommand } = require('./phala-cli');

test('splitCommand preserves tokenized CLI words', () => {
  assert.deepEqual(splitCommand(' npx --yes phala '), ['npx', '--yes', 'phala']);
});

test('resolvePhalaCliCommand honors explicit PHALA_CLI override', () => {
  assert.deepEqual(
    resolvePhalaCliCommand({ PHALA_CLI: 'npx --yes phala' }, () => false),
    ['npx', '--yes', 'phala'],
  );
});

test('resolvePhalaCliCommand prefers global phala when present', () => {
  assert.deepEqual(
    resolvePhalaCliCommand({}, (command) => command === 'phala'),
    ['phala'],
  );
});

test('resolvePhalaCliCommand falls back to npx phala', () => {
  assert.deepEqual(
    resolvePhalaCliCommand({}, (command) => command === 'npx'),
    ['npx', '--yes', 'phala'],
  );
});

test('resolvePhalaCliCommand returns null when no launcher is available', () => {
  assert.equal(resolvePhalaCliCommand({}, () => false), null);
});
