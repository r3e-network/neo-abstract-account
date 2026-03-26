import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), 'utf8');

test('did service integrates Web3Auth as the NeoDID identity root', () => {
  const source = read('src/services/didService.js');

  assert.match(source, /@web3auth\/modal/);
  assert.match(source, /new modal\.Web3Auth/);
  assert.match(source, /provider:\s*RUNTIME_CONFIG\.neoDidProvider/);
  assert.match(source, /web3auth:/);
  assert.match(source, /buildNeoDidSubject/);
  assert.match(source, /didVerificationEndpoint/);
  assert.match(source, /serviceDid/);
  assert.match(source, /identityRoot/);
});



test('morpheus did service can bind DIDs and invoke AA verifier requests', () => {
  const source = read('src/services/morpheusDidService.js');
  const proxy = read('api/morpheus-neodid.js');
  const keyProxy = read('api/morpheus-oracle-public-key.js');

  assert.match(source, /bindDid/);
  assert.match(source, /resolveDid/);
  assert.match(source, /previewRecoveryTicket/);
  assert.match(source, /previewActionTicket/);
  assert.match(source, /previewZkLoginTicket/);
  assert.match(source, /invokeRecoveryRequest/);
  assert.match(source, /invokeProxySessionRequest/);
  assert.match(source, /finalizeRecovery/);
  assert.match(source, /cancelRecovery/);
  assert.match(source, /revokeProxySession/);
  assert.match(source, /zklogin_verifier_params_hex/);
  assert.match(source, /fetchVerifierContractByAddress/);
  assert.match(source, /fetchUnifiedVerifierState/);
  assert.match(source, /requestRecoveryTicket/);
  assert.match(source, /requestActionSession/);
  assert.match(proxy, /Unsupported Morpheus NeoDID action/);
  assert.match(proxy, /normalized === 'resolve'/);
  assert.match(keyProxy, /oracle\/public-key/);
});

test('notification service supports email and sms webhook delivery', () => {
  const source = read('src/services/notificationService.js');
  const apiSource = read('api/did-notify.js');

  assert.match(source, /sendRecoveryEmail/);
  assert.match(source, /sendRecoverySms/);
  assert.match(apiSource, /DID_EMAIL_WEBHOOK_URL/);
  assert.match(apiSource, /DID_SMS_WEBHOOK_URL/);
  assert.match(apiSource, /channel === 'email'/);
  assert.match(apiSource, /channel === 'sms'/);
});

test('did verification api validates Web3Auth tokens against JWKS', () => {
  const source = read('api/did-verify.js');

  assert.match(source, /createRemoteJWKSet/);
  assert.match(source, /jwtVerify/);
  assert.match(source, /WEB3AUTH_JWKS_URL/);
  assert.match(source, /provider:\s*'web3auth'/);
});

test('main layout and home workspace expose a DID connection path', () => {
  const layout = read('src/components/layout/MainLayout.vue');
  const controls = read('src/components/layout/ConnectionControls.vue');
  const workspace = read('src/features/operations/components/HomeOperationsWorkspace.vue');
  const panel = read('src/features/operations/components/DidIdentityPanel.vue');
  const identityView = read('src/views/IdentityView.vue');
  const router = read('src/router/index.js');

  assert.match(layout, /defineAsyncComponent/);
  assert.match(layout, /ConnectionControls/);
  assert.match(controls, /Open Identity/);
  assert.match(controls, /Disconnect Web3Auth/);
  assert.match(controls, /useDidConnection/);
  assert.match(workspace, /useDidConnection/);
  assert.match(workspace, /didConnection/);
  assert.match(workspace, /connectDid\(/);
  assert.match(workspace, /Open Identity Workspace/);
  assert.match(identityView, /Web3Auth \/ NeoDID Workspace/);
  assert.match(identityView, /DidIdentityPanel/);
  assert.match(router, /path: 'identity'/);
  assert.match(panel, /Google/);
  assert.match(panel, /Email/);
  assert.match(panel, /SMS/);
  assert.match(panel, /Send Email Notice/);
  assert.match(panel, /Send SMS Notice/);
  assert.match(panel, /Finalize Recovery/);
  assert.match(panel, /Cancel Recovery/);
  assert.match(panel, /Revoke Session/);
  assert.match(panel, /ZK Login Verifier Params/);
  assert.match(panel, /notificationService/);
});
