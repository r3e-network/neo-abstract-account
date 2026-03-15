import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

import {
  DEFAULT_ABSTRACT_ACCOUNT_HASH,
  DEFAULT_ABSTRACT_ACCOUNT_HASH_TESTNET,
  DEFAULT_DID_PROVIDER,
  DEFAULT_EXPLORER_BASE_URL,
  DEFAULT_MATRIX_CONTRACT_HASH,
  DEFAULT_N3INDEX_API_BASE_URL,
  DEFAULT_RPC_URL,
  DEFAULT_RPC_URL_TESTNET,
  DEFAULT_WEB3AUTH_CHAIN_ID,
  DEFAULT_WEB3AUTH_CHAIN_NAMESPACE,
  DEFAULT_WEB3AUTH_NETWORK,
  DEFAULT_WEB3AUTH_PROJECT_NAME,
  DEFAULT_WEB3AUTH_RPC_TARGET,
  MORPHEUS_NETWORK_DEFAULTS,
  getRuntimeConfig,
  resolveRuntimeNetwork,
  resolveAbstractAccountHash,
  resolveRpcUrl,
  sanitizeHex
} from '../src/config/runtimeConfig.js';

test('sanitizeHex removes prefix and lowercases input', () => {
  assert.equal(sanitizeHex('0xABCD'), 'abcd');
  assert.equal(sanitizeHex('abcd'), 'abcd');
});

test('resolveAbstractAccountHash accepts valid 40-byte hex values', () => {
  assert.equal(
    resolveAbstractAccountHash('0x49C095CE04D38642E39155F5481615C58227A498'),
    '49c095ce04d38642e39155f5481615c58227a498'
  );
});

test('resolveAbstractAccountHash falls back for invalid values', () => {
  assert.equal(resolveAbstractAccountHash('bad-value'), DEFAULT_ABSTRACT_ACCOUNT_HASH);
});

test('default abstract account hash tracks the hardened verified deployment', () => {
  assert.equal(DEFAULT_ABSTRACT_ACCOUNT_HASH, '9742b4ed62a84a886f404d36149da6147528ee33');
});

test('testnet abstract account hash tracks the published V3 testnet deployment', () => {
  assert.equal(DEFAULT_ABSTRACT_ACCOUNT_HASH_TESTNET, 'e24d2980d17d2580ff4ee8dc5dddaa20e3caec38');
});

test('resolveRpcUrl preserves explicit values and defaults otherwise', () => {
  assert.equal(resolveRpcUrl('https://example.com/rpc'), 'https://example.com/rpc');
  assert.equal(resolveRpcUrl(''), DEFAULT_RPC_URL);
});

test('frontend ships a runtime env example for browser and server routes', () => {
  const examplePath = path.resolve(import.meta.dirname, '..', '.env.example');
  assert.equal(fs.existsSync(examplePath), true, 'expected frontend/.env.example to exist');

  const example = fs.readFileSync(examplePath, 'utf8');
  assert.match(example, /VITE_AA_RPC_URL=/);
  assert.match(example, /VITE_SUPABASE_URL=/);
  assert.match(example, /VITE_SUPABASE_ANON_KEY=/);
  assert.match(example, /VITE_AA_RELAY_URL=/);
  assert.match(example, /VITE_AA_RELAY_META_ENABLED=/);
  assert.match(example, /VITE_AA_MATRIX_CONTRACT_HASH=/);
  assert.match(example, /VITE_WEB3AUTH_CLIENT_ID=/);
  assert.match(example, /VITE_WEB3AUTH_PROJECT_NAME=/);
  assert.match(example, /VITE_WEB3AUTH_NETWORK=/);
  assert.match(example, /VITE_NEODID_PROVIDER=/);
  assert.match(example, /VITE_DID_VERIFICATION_ENDPOINT=/);
  assert.match(example, /VITE_DID_NOTIFICATION_ENDPOINT=/);
  assert.match(example, /VITE_MORPHEUS_NEODID_ENDPOINT=/);
  assert.match(example, /VITE_MORPHEUS_ORACLE_KEY_ENDPOINT=/);
  assert.match(example, /AA_RELAY_RPC_URL=/);
  assert.match(example, /AA_RELAY_WIF=/);
  assert.match(example, /AA_RELAY_ALLOWED_HASH=/);
  assert.match(example, /AA_RELAY_ALLOW_RAW_FORWARD=/);
  assert.match(example, /SUPABASE_SERVICE_ROLE_KEY=/);
  assert.match(example, /DID_EMAIL_WEBHOOK_URL=/);
  assert.match(example, /DID_SMS_WEBHOOK_URL=/);
  assert.match(example, /MORPHEUS_API_BASE_URL=/);
  assert.match(example, /server-only/i);
});

test('getRuntimeConfig prefers Vite overrides', () => {
  const config = getRuntimeConfig({
    VITE_AA_HASH: '0x1111111111111111111111111111111111111111',
    VITE_AA_RPC_URL: 'https://rpc.example.org'
  });

  assert.deepEqual(config, {
    abstractAccountHash: '1111111111111111111111111111111111111111',
    abstractAccountDomain: 'smartwallet.neo',
    rpcUrl: 'https://rpc.example.org',
    supabaseUrl: '',
    supabaseAnonKey: '',
    relayEndpoint: '/api/relay-transaction',
    relayRpcUrl: 'https://rpc.example.org',
    relayMetaEnabled: false,
    relayRawEnabled: false,
    explorerBaseUrl: DEFAULT_EXPLORER_BASE_URL,
    matrixContractHash: DEFAULT_MATRIX_CONTRACT_HASH,
    n3IndexApiBaseUrl: DEFAULT_N3INDEX_API_BASE_URL,
    n3IndexNetwork: 'mainnet',
    neoNnsContractHash: '50ac1c37690cc2cfc594472833cf57505d5f46de',
    web3AuthClientId: '',
    web3AuthProjectName: DEFAULT_WEB3AUTH_PROJECT_NAME,
    web3AuthNetwork: DEFAULT_WEB3AUTH_NETWORK,
    web3AuthChainNamespace: DEFAULT_WEB3AUTH_CHAIN_NAMESPACE,
    web3AuthChainId: DEFAULT_WEB3AUTH_CHAIN_ID,
    web3AuthRpcTarget: DEFAULT_WEB3AUTH_RPC_TARGET,
    web3AuthRedirectUrl: '',
    web3AuthEmailLoginEnabled: true,
    web3AuthSmsLoginEnabled: true,
    neoDidProvider: DEFAULT_DID_PROVIDER,
    neoDidDomain: 'neodid.morpheus.neo',
    morpheusApiBaseUrl: 'https://neo-morpheus-oracle-web.vercel.app',
    morpheusNeoDidServiceDid: 'did:morpheus:neo_n3:service:neodid',
    didVerificationEndpoint: '/api/did-verify',
    didNotificationEndpoint: '/api/did-notify',
    morpheusNeoDidEndpoint: '/api/morpheus-neodid',
    morpheusNeoDidResolveEndpoint: '/api/morpheus-neodid?action=resolve',
    morpheusOracleKeyEndpoint: '/api/morpheus-oracle-public-key',
    didNotificationEmailEnabled: true,
    didNotificationSmsEnabled: true,
  });
});

test('resolveRuntimeNetwork switches defaults to testnet when requested', () => {
  assert.equal(resolveRuntimeNetwork({ VITE_AA_NETWORK: 'testnet' }), 'testnet');
  assert.equal(resolveRuntimeNetwork({ VITE_MORPHEUS_NETWORK: 'testnet' }), 'testnet');
  assert.equal(resolveRuntimeNetwork({ VITE_N3INDEX_NETWORK: 'testnet' }), 'testnet');
  assert.equal(resolveRuntimeNetwork({ VITE_AA_NETWORK: 'mainnet' }), 'mainnet');
});

test('getRuntimeConfig uses testnet defaults when the selected runtime network is testnet', () => {
  const config = getRuntimeConfig({
    VITE_AA_NETWORK: 'testnet',
  });

  assert.equal(config.abstractAccountHash, DEFAULT_ABSTRACT_ACCOUNT_HASH_TESTNET);
  assert.equal(config.abstractAccountDomain, '');
  assert.equal(config.rpcUrl, DEFAULT_RPC_URL_TESTNET);
  assert.equal(config.relayRpcUrl, DEFAULT_RPC_URL_TESTNET);
  assert.equal(config.n3IndexNetwork, 'testnet');
  assert.equal(config.neoDidDomain, '');
});

test('network defaults keep mainnet and testnet anchors explicit', () => {
  assert.deepEqual(MORPHEUS_NETWORK_DEFAULTS.mainnet, {
    abstractAccountHash: '9742b4ed62a84a886f404d36149da6147528ee33',
    abstractAccountDomain: 'smartwallet.neo',
    rpcUrl: 'https://mainnet1.neo.coz.io:443',
    n3IndexNetwork: 'mainnet',
    neoDidDomain: 'neodid.morpheus.neo',
  });
  assert.deepEqual(MORPHEUS_NETWORK_DEFAULTS.testnet, {
    abstractAccountHash: 'e24d2980d17d2580ff4ee8dc5dddaa20e3caec38',
    abstractAccountDomain: '',
    rpcUrl: 'https://testnet1.neo.coz.io:443',
    n3IndexNetwork: 'testnet',
    neoDidDomain: '',
  });
});


test('default matrix contract hash tracks the validated testnet deployment', () => {
  assert.equal(DEFAULT_MATRIX_CONTRACT_HASH, '89908093c5ccc463e2c5744d6bacb06108b60a75');
});

test('default n3index api base url tracks the documented public edge', () => {
  assert.equal(DEFAULT_N3INDEX_API_BASE_URL, 'https://api.n3index.dev');
});
