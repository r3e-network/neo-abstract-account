import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  isBlockedNodeName,
  shouldStripAttribute
} from '../src/features/docs/rendering.js';

const frontendRoot = path.resolve(import.meta.dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), 'utf8');
const readRepo = (relativePath) => fs.readFileSync(path.join(frontendRoot, '..', relativePath), 'utf8');
const readFrontendPackage = () => JSON.parse(read('package.json'));

test('isBlockedNodeName blocks executable embedded tags', () => {
  assert.equal(isBlockedNodeName('script'), true);
  assert.equal(isBlockedNodeName('IFRAME'), true);
  assert.equal(isBlockedNodeName('object'), true);
  assert.equal(isBlockedNodeName('div'), false);
});

test('shouldStripAttribute removes inline handlers and javascript urls', () => {
  assert.equal(shouldStripAttribute('onclick', 'alert(1)'), true);
  assert.equal(shouldStripAttribute('href', 'javascript:alert(1)'), true);
  assert.equal(shouldStripAttribute('src', ' JAVASCRIPT:alert(1)'), true);
  assert.equal(shouldStripAttribute('href', 'https://example.com'), false);
  assert.equal(shouldStripAttribute('class', 'safe-class'), false);
});

test('docs registry uses the repo README as the overview source of truth', () => {
  const registrySource = read('src/features/docs/registry.js');
  assert.match(registrySource, /@repo\/README\.md\?raw/);
});

test('workflow doc explains wrapper execution after proxy hardening', () => {
  const workflowDoc = read('src/assets/docs/workflow.md');
  assert.match(workflowDoc, /executeByAddress/);
  assert.match(workflowDoc, /direct proxy-signed external/i);
});

test('sdk doc references the verified hardened testnet hash', () => {
  const sdkDoc = read('src/assets/docs/sdk-usage.md');
  assert.match(sdkDoc, /0x711c1899a3b7fa0e055ae0d17c9acfcd1bef6423/i);
});

test('repo docs describe a hardened policy-gated execution surface', () => {
  const readme = readRepo('README.md');
  const architectureDoc = readRepo('docs/architecture.md');

  assert.match(readme, /policy-gated/i);
  assert.match(architectureDoc, /policy-gated/i);
  assert.match(architectureDoc, /executeByAddress|executeMetaTx/);
  assert.doesNotMatch(architectureDoc, /fully programmable logic gates/i);
});

test('repo README includes a quickstart covering install build and test workflows', () => {
  const readme = readRepo('README.md');

  assert.match(readme, /Quickstart/i);
  assert.match(readme, /dotnet test/i);
  assert.match(readme, /npm (ci|install)/i);
  assert.match(readme, /npm run build/i);
});

test('custom verifier docs explain verifier approval does not bypass runtime restrictions', () => {
  const verifierDoc = read('src/assets/docs/custom-verifiers.md');

  assert.match(verifierDoc, /does not bypass/i);
  assert.match(verifierDoc, /whitelist|blacklist|max-transfer|method policy/i);
});

test('DocsView lazy-loads heavy markdown and diagram dependencies', () => {
  const docsViewSource = read('src/views/DocsView.vue');

  assert.match(docsViewSource, /await import\('marked'\)/);
  assert.match(docsViewSource, /await import\('highlight\.js\/lib\/core'\)/);
  assert.match(docsViewSource, /await import\('highlight\.js\/lib\/languages\/bash'\)/);
  assert.match(docsViewSource, /await import\('highlight\.js\/lib\/languages\/javascript'\)/);
  assert.match(docsViewSource, /await import\('highlight\.js\/lib\/languages\/csharp'\)/);
  assert.match(docsViewSource, /await import\('mermaid'\)/);
  assert.doesNotMatch(docsViewSource, /await import\('highlight\.js'\)/);
  assert.doesNotMatch(docsViewSource, /import mermaid from 'mermaid';/);
});

test('vite config defines manual chunk groups for heavy frontend dependencies', () => {
  const viteConfigSource = read('vite.config.js');

  assert.match(viteConfigSource, /manualChunks/);
  assert.match(viteConfigSource, /vue-flow/);
  assert.match(viteConfigSource, /ethers/);
  assert.doesNotMatch(viteConfigSource, /neon-core/);
  assert.doesNotMatch(viteConfigSource, /return 'mermaid'/);
  assert.doesNotMatch(viteConfigSource, /return 'cytoscape'/);
});

test('studio controller uses local neo helpers instead of Neon SDK bundles', () => {
  const controllerSource = read('src/features/studio/useStudioController.js');

  assert.match(controllerSource, /from '\@\/utils\/neo\.js'/);
  assert.doesNotMatch(controllerSource, /await import\('@cityofzion\/neon-core'\)/);
  assert.doesNotMatch(controllerSource, /await import\('@cityofzion\/neon-js'\)/);
});

test('frontend package does not depend on Neon SDK bundles directly', () => {
  const packageJson = readFrontendPackage();

  assert.equal(packageJson.dependencies['@cityofzion/neon-core'], undefined);
  assert.equal(packageJson.dependencies['@cityofzion/neon-js'], undefined);
});

test('HomeView lazy-loads the architecture diagram component', () => {
  const homeViewSource = read('src/views/HomeView.vue');

  assert.match(homeViewSource, /defineAsyncComponent/);
  assert.match(homeViewSource, /import\('\@\/components\/ArchitectureDiagram\.vue'\)/);
  assert.doesNotMatch(homeViewSource, /import ArchitectureDiagram from/);
});

test('AbstractAccountTool lazy-loads heavy studio panels', () => {
  const studioToolSource = read('src/components/AbstractAccountTool.vue');

  assert.match(studioToolSource, /defineAsyncComponent/);
  assert.match(studioToolSource, /import\('\@\/features\/studio\/components\/CreateAccountPanel\.vue'\)/);
  assert.match(studioToolSource, /import\('\@\/features\/studio\/components\/ContractSourcePanel\.vue'\)/);
  assert.doesNotMatch(studioToolSource, /import CreateAccountPanel from/);
});
