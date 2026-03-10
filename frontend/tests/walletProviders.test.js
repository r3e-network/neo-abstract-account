import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const frontendRoot = path.resolve(import.meta.dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), 'utf8');

test('wallet service recognizes NEOLineN3 and NEOLine module-style providers', () => {
  const source = read('src/services/walletService.js');

  assert.match(source, /window\.NEOLineN3\?\.N3/);
  assert.match(source, /window\.NEOLine\?\.NEO/);
  assert.match(source, /candidate\.api\?\.getAccount/);
  assert.match(source, /candidate\.api\?\.invoke/);
  assert.doesNotMatch(source, /WalletService Debug/);
});
