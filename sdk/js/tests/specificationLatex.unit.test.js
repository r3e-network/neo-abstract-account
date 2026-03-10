const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const specPath = path.join(repoRoot, 'docs/specification/neo_abstract_account_spec.tex');

test('formal latex specification exists and covers core sections', () => {
  assert.equal(fs.existsSync(specPath), true, 'expected LaTeX specification file to exist');
  const source = fs.readFileSync(specPath, 'utf8');

  assert.match(source, /\\section\{Abstract\}/);
  assert.match(source, /\\section\{System Architecture\}/);
  assert.match(source, /\\section\{Protocol Workflows\}/);
  assert.match(source, /\\section\{Data Flow and State Model\}/);
  assert.match(source, /\\section\{Security Considerations\}/);
  assert.match(source, /\\section\{Recovery Verifiers\}/);
  assert.match(source, /\\begin\{tikzpicture\}/);
  assert.match(source, /\\begin\{table\}/);
});


test('specification folder excludes generated latex artifacts from source control intent', () => {
  const specDir = path.join(repoRoot, 'docs/specification');
  const files = fs.readdirSync(specDir);
  assert.equal(files.includes('neo_abstract_account_spec_complete.aux'), false);
  assert.equal(files.includes('neo_abstract_account_spec_complete.log'), false);
  assert.equal(files.includes('neo_abstract_account_spec_complete.out'), false);
  assert.equal(files.includes('neo_abstract_account_spec_complete.pdf'), false);
  assert.equal(files.includes('neo_abstract_account_spec_complete.tex'), false);
  assert.equal(files.includes('IEEEtran.cls'), false);
});
