import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isBlockedNodeName,
  shouldStripAttribute
} from '../src/features/docs/rendering.js';

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));
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

test('supplemental root docs are preserved and indexable', () => {
  const docsIndex = readRepo('docs/INDEX.md');
  const howItWorks = readRepo('docs/HOW_IT_WORKS.md');
  const userGuide = readRepo('docs/USER_GUIDE.md');
  const workflows = readRepo('docs/WORKFLOWS.md');
  const dataFlow = readRepo('docs/DATA_FLOW.md');
  const quickReference = readRepo('docs/QUICK_REFERENCE.md');
  const smokeTest = readRepo('docs/POST_DEPLOY_SMOKE_TEST.md');
  const readmeZh = readRepo('README.zh-CN.md');

  assert.match(docsIndex, /HOW_IT_WORKS\.md/);
  assert.match(docsIndex, /POST_DEPLOY_SMOKE_TEST\.md/);
  assert.match(docsIndex, /USER_GUIDE\.md/);
  assert.match(docsIndex, /WORKFLOWS\.md/);
  assert.match(docsIndex, /DATA_FLOW\.md/);
  assert.match(docsIndex, /QUICK_REFERENCE\.md/);
  assert.match(howItWorks, /How It Works|Usage Guide/i);
  assert.match(userGuide, /User Guide/i);
  assert.match(workflows, /Workflow|Lifecycle/i);
  assert.match(dataFlow, /Data Flow|Storage/i);
  assert.match(quickReference, /Quick Reference/i);
  assert.match(smokeTest, /Post-Deploy Smoke Test/i);
  assert.match(smokeTest, /Wallet Detection/i);
  assert.match(readmeZh, /README\.md/);
});

test('docs registry uses the repo README as the overview source of truth', () => {
  const registrySource = read('src/features/docs/registry.js');
  assert.match(registrySource, /@repo\/README\.md\?raw/);
});

test('workflow doc explains the V3 execution path after proxy hardening', () => {
  const workflowDoc = read('src/assets/docs/workflow.md');
  assert.match(workflowDoc, /executeUserOp/);
  assert.match(workflowDoc, /direct proxy-signed external/i);
});

test('sdk doc references the verified hardened testnet hash', () => {
  const sdkDoc = read('src/assets/docs/sdk-usage.md');
  assert.match(sdkDoc, /0x5be915aea3ce85e4752d522632f0a9520e377aaf/i);
});

test('repo docs describe a hardened policy-gated execution surface', () => {
  const readme = readRepo('README.md');
  const architectureDoc = readRepo('docs/architecture.md');

  assert.match(readme, /policy-gated/i);
  assert.match(architectureDoc, /policy-gated/i);
  assert.match(architectureDoc, /executeUnifiedByAddress|executeUnified/);
  assert.doesNotMatch(architectureDoc, /fully programmable logic gates/i);
});

test('production docs describe validation preview, module lifecycle, and relay trust boundaries', () => {
  const readme = readRepo('README.md');
  const securityAudit = readRepo('docs/SECURITY_AUDIT.md');
  const frontendArchitecture = read('src/assets/docs/architecture.md');

  assert.match(readme, /validation preview|previewUserOpValidation/i);
  assert.match(readme, /module lifecycle/i);
  assert.match(readme, /paymaster sponsorship does not replace|relay trust boundary|paymaster does not authorize/i);

  assert.match(frontendArchitecture, /Module Lifecycle/i);
  assert.match(frontendArchitecture, /Validation Preview|relay preflight/i);
  assert.match(frontendArchitecture, /compatibility-only/i);

  assert.match(securityAudit, /external third-party review/i);
  assert.match(securityAudit, /property-based|adversarial/i);
});

test('historical architecture and audit docs stay aligned with the professionalized V3 runtime', () => {
  const v3Blueprint = readRepo('docs/AA_V3_ARCHITECTURE.en.md');
  const securityAudit = readRepo('docs/SECURITY_AUDIT.md');

  assert.doesNotMatch(v3Blueprint, /Ultimate Abstract Account|Ultimate Security Architecture|Ultimate Answer/i);
  assert.doesNotMatch(v3Blueprint, /killer plugin|panoramic trusted interaction gateway|frictionless cross-chain/i);
  assert.match(v3Blueprint, /historical|design note|current runtime/i);

  assert.doesNotMatch(securityAudit, /contracts\/AbstractAccount\.cs/);
  assert.doesNotMatch(securityAudit, /contracts\/AbstractAccount\./);
  assert.match(securityAudit, /UnifiedSmartWalletV3|current V3 runtime/i);
});

test('repo README keeps a single quickstart heading', () => {
  const readme = readRepo('README.md');
  const matches = readme.match(/^## Quickstart$/gm) || [];

  assert.equal(matches.length, 1);
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

test('core explainer docs provide onboarding architecture workflow and boundary guidance', () => {
  const guideDoc = read('src/assets/docs/guide.md');
  const architectureDoc = read('src/assets/docs/architecture.md');
  const workflowDoc = read('src/assets/docs/workflow.md');
  const dataFlowDoc = read('src/assets/docs/data-flow.md');
  const readme = readRepo('README.md');

  assert.match(guideDoc, /Who This Is For/i);
  assert.match(guideDoc, /Choose the Right Path/i);
  assert.match(guideDoc, /What Happens During One Transaction\?/i);
  assert.match(guideDoc, /Glossary/i);

  assert.match(architectureDoc, /Component Map/i);
  assert.match(architectureDoc, /Verification Pipeline/i);
  assert.match(architectureDoc, /Application Execution Pipeline/i);
  assert.match(architectureDoc, /Contract File Map/i);

  assert.match(workflowDoc, /First Transaction Walkthrough/i);
  assert.match(workflowDoc, /Choose the Submission Path/i);
  assert.match(workflowDoc, /Before You Broadcast/i);

  assert.match(dataFlowDoc, /System Boundaries/i);
  assert.match(dataFlowDoc, /Data Ownership Matrix/i);
  assert.match(dataFlowDoc, /Mutation Authority by Boundary/i);

  assert.match(readme, /Documentation Map/i);
});

test('operations docs cover the app workspace, anonymous drafts, both broadcast modes, and bounded draft retention', () => {
  const workflowDoc = read('src/assets/docs/workflow.md');
  const mixedMultisigDoc = read('src/assets/docs/mixed-multisig.md');
  const sdkDoc = read('src/assets/docs/sdk-usage.md');
  const readme = readRepo('README.md');

  assert.match(workflowDoc, /app workspace/i);
  assert.match(workflowDoc, /client-side broadcast/i);
  assert.match(workflowDoc, /relay broadcast/i);
  assert.match(workflowDoc, /localStorage|local-only fallback/i);
  assert.match(workflowDoc, /NEP-17 transfer|Multisig Draft|Generic Invoke/i);
  assert.match(workflowDoc, /accountId hash|UserOperation/i);
  assert.match(workflowDoc, /100 activity entries/i);
  assert.match(workflowDoc, /12 submission receipts/i);
  assert.match(readme, /100 activity entries/i);
  assert.match(readme, /12 submission receipts/i);
  assert.match(readme, /Deployment Checklist/i);
  assert.match(readme, /supabase\/migrations\/20260308_home_operations_workspace\.sql/i);
  assert.match(readme, /20260309_shared_draft_collaboration_capability\.sql/i);
  assert.match(readme, /20260310_shared_draft_collaboration_cleanup\.sql/i);
  assert.match(readme, /20260311_rotate_draft_collaboration_slug\.sql/i);
  assert.match(readme, /20260312_scoped_draft_access\.sql/i);
  assert.match(readme, /20260313_activity_scope_guards\.sql/i);
  assert.match(readme, /20260314_signed_operator_mutations\.sql/i);
  assert.match(readme, /collaborator link/i);
  assert.match(readme, /operator link/i);
  assert.match(readme, /rotate collaborator link/i);
  assert.match(readme, /read-only/i);
  assert.match(readme, /AA_RELAY_WIF/i);
  assert.match(readme, /frontend\/\.env\.example/i);
  assert.match(readme, /SUPABASE_SERVICE_ROLE_KEY/i);
  assert.match(readme, /signed operator mutation/i);
  assert.match(readme, /draft-operator/i);
  assert.match(readme, /VITE_AA_EXPLORER_BASE_URL/i);
  assert.match(mixedMultisigDoc, /anonymous share/i);
  assert.match(mixedMultisigDoc, /collaborator link/i);
  assert.match(mixedMultisigDoc, /operator link/i);
  assert.match(mixedMultisigDoc, /rotate collaborator link/i);
  assert.match(mixedMultisigDoc, /read-only/i);
  assert.match(mixedMultisigDoc, /supabase/i);
  assert.match(mixedMultisigDoc, /100 activity entries/i);
  assert.match(mixedMultisigDoc, /12 submission receipts/i);
  assert.match(read('src/assets/docs/hook-plugin-guide.md'), /Choose In Layers/i);
  assert.match(read('src/assets/docs/address-market.md'), /What A Listing Includes/i);
  assert.match(sdkDoc, /VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY|relay/i);
  assert.match(sdkDoc, /Runtime Reference/i);
  assert.match(sdkDoc, /Relay Behavior Matrix/i);
  assert.match(sdkDoc, /preflight only/i);
  assert.match(sdkDoc, /signed raw relay/i);
  assert.match(sdkDoc, /meta relay submission|relay invocation/i);
  assert.match(sdkDoc, /Safe Defaults/i);
  assert.match(sdkDoc, /client-side broadcast is the default safe path/i);
  assert.match(sdkDoc, /optional knobs/i);
  assert.match(sdkDoc, /Security Posture/i);
  assert.match(sdkDoc, /safe to expose client-side/i);
  assert.match(sdkDoc, /server-only/i);
  assert.match(sdkDoc, /SUPABASE_SERVICE_ROLE_KEY/i);
  assert.match(sdkDoc, /AA_RELAY_ALLOWED_HASH/i);
  assert.match(sdkDoc, /AA_RELAY_ALLOW_RAW_FORWARD/i);
  assert.match(sdkDoc, /frontend\/\.env\.example/i);
  assert.match(sdkDoc, /draft-operator/i);
  assert.match(sdkDoc, /signed operator mutation/i);
  assert.match(sdkDoc, /Recommended Deployment Profiles/i);
  assert.match(sdkDoc, /local-only/i);
  assert.match(sdkDoc, /collaborative/i);
  assert.match(sdkDoc, /read-only share link/i);
  assert.match(sdkDoc, /collaborator link/i);
  assert.match(sdkDoc, /operator link/i);
  assert.match(sdkDoc, /rotate collaborator link/i);
  assert.match(sdkDoc, /full relay-enabled/i);
  assert.match(sdkDoc, /\.env\.local Examples/i);
  assert.match(sdkDoc, /local-only profile/i);
  assert.match(sdkDoc, /collaborative profile/i);
  assert.match(sdkDoc, /full relay-enabled profile/i);
  assert.match(sdkDoc, /Testnet vs Production Checklist/i);
  assert.match(sdkDoc, /testnet/i);
  assert.match(sdkDoc, /production/i);
  assert.match(sdkDoc, /AA_RELAY_WIF/i);
  assert.match(sdkDoc, /VITE_AA_EXPLORER_BASE_URL/i);
  assert.match(sdkDoc, /relay meta mode|relay invocation mode/i);
  assert.match(sdkDoc, /Minimum Capability Matrix/i);
  assert.match(sdkDoc, /without Supabase/i);
  assert.match(sdkDoc, /without relay/i);
  assert.match(sdkDoc, /without explorer/i);
  assert.match(sdkDoc, /Troubleshooting/i);
  assert.match(sdkDoc, /missing Supabase env/i);
  assert.match(sdkDoc, /AA_RELAY_WIF/i);
  assert.match(sdkDoc, /relay meta mode/i);
  assert.match(sdkDoc, /explorer base url/i);
  assert.match(sdkDoc, /VITE_AA_EXPLORER_BASE_URL/i);
  assert.match(sdkDoc, /100 activity entries/i);
  assert.match(sdkDoc, /12 submission receipts/i);
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
  assert.doesNotMatch(docsViewSource, /sanitizeRenderedHtml\(svg\)/);
});

test('DocsView supports deep-linking to a specific doc entry through the query string', () => {
  const docsViewSource = read('src/views/DocsView.vue');

  assert.match(docsViewSource, /useRoute, useRouter/);
  assert.match(docsViewSource, /route\.query\.doc/);
  assert.match(docsViewSource, /router\.replace/);
  assert.match(docsViewSource, /resolveDocKey/);
});

test('vite config defines manual chunk groups for heavy frontend dependencies', () => {
  const viteConfigSource = read('vite.config.js');

  assert.match(viteConfigSource, /manualChunks/);
  assert.match(viteConfigSource, /buffer-polyfill/);
  assert.match(viteConfigSource, /vue-flow/);
  assert.match(viteConfigSource, /supabase/);
  assert.match(viteConfigSource, /jose/);
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
