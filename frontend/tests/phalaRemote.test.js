import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseLastJsonLine,
  resolvePhalaCliCommand,
  splitCommand,
} from '../api/phala-remote.js';

test('splitCommand tokenizes explicit phala CLI overrides', () => {
  assert.deepEqual(splitCommand(' npx --yes phala '), ['npx', '--yes', 'phala']);
});

test('resolvePhalaCliCommand honors explicit override first', () => {
  assert.deepEqual(
    resolvePhalaCliCommand({ PHALA_CLI: 'npx --yes phala' }, () => false),
    ['npx', '--yes', 'phala'],
  );
});

test('resolvePhalaCliCommand falls back to npx when global phala is absent', () => {
  assert.deepEqual(
    resolvePhalaCliCommand({}, (command) => command === 'npx'),
    ['npx', '--yes', 'phala'],
  );
});

test('parseLastJsonLine returns the last parseable JSON object from mixed output', () => {
  const parsed = parseLastJsonLine(`
warning
{"status":403,"body":{"error":"forbidden"}}
noise
{"status":200,"body":{"approved":true}}
`);

  assert.deepEqual(parsed, {
    status: 200,
    body: {
      approved: true,
    },
  });
});
