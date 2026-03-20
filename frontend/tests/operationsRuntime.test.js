import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { getRuntimeConfig, DEFAULT_RELAY_ENDPOINT } from '../src/config/runtimeConfig.js';
import { getOperationsRuntime } from '../src/config/operationsRuntime.js';
import { createSupabaseBrowserClient, resetSupabaseClientForTests } from '../src/lib/supabaseClient.js';

test('getRuntimeConfig exposes Supabase and relay settings', () => {
  const config = getRuntimeConfig({
    VITE_AA_HASH: '0x1111111111111111111111111111111111111111',
    VITE_AA_RPC_URL: 'https://rpc.example.org',
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'public-anon-key',
  });

  assert.deepEqual(config, {
    morpheusNetwork: 'mainnet',
    abstractAccountHash: '1111111111111111111111111111111111111111',
    abstractAccountDomain: 'smartwallet.neo',
    rpcUrl: 'https://rpc.example.org',
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'public-anon-key',
    relayEndpoint: DEFAULT_RELAY_ENDPOINT,
    relayRpcUrl: 'https://rpc.example.org',
    relayMetaEnabled: false,
    relayRawEnabled: false,
    explorerBaseUrl: 'https://neotube.io/tx/',
    matrixContractHash: '89908093c5ccc463e2c5744d6bacb06108b60a75',
    addressMarketHash: '',
    n3IndexApiBaseUrl: 'https://api.n3index.dev',
    n3IndexNetwork: 'mainnet',
    neoNnsContractHash: '50ac1c37690cc2cfc594472833cf57505d5f46de',
    web3AuthClientId: '',
    web3AuthProjectName: 'DID.Morpheus',
    web3AuthNetwork: 'sapphire_mainnet',
    web3AuthChainNamespace: 'eip155',
    web3AuthChainId: '0x1',
    web3AuthRpcTarget: 'https://rpc.ankr.com/eth',
    web3AuthRedirectUrl: '',
    web3AuthEmailLoginEnabled: true,
    web3AuthSmsLoginEnabled: true,
    neoDidProvider: 'web3auth',
    neoDidDomain: 'neodid.morpheus.neo',
    morpheusApiBaseUrl: 'https://morpheus.meshmini.app/mainnet',
    morpheusNeoDidServiceDid: 'did:morpheus:neo_n3:service:neodid',
    didVerificationEndpoint: '/api/did-verify',
    didNotificationEndpoint: '/api/did-notify',
    morpheusNeoDidEndpoint: '/api/morpheus-neodid',
    morpheusNeoDidResolveEndpoint: '/api/morpheus-neodid?action=resolve',
    morpheusOracleKeyEndpoint: '/api/morpheus-oracle-public-key',
    didNotificationEmailEnabled: true,
    didNotificationSmsEnabled: true,
    vanityServiceEndpoint: '/api/vanity',
  });
});

test('getRuntimeConfig switches implicit defaults to testnet when selected', () => {
  const config = getRuntimeConfig({
    VITE_AA_NETWORK: 'testnet',
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'public-anon-key',
  });

  assert.equal(config.abstractAccountHash, 'e24d2980d17d2580ff4ee8dc5dddaa20e3caec38');
  assert.equal(config.abstractAccountDomain, '');
  assert.equal(config.rpcUrl, 'https://testnet1.neo.coz.io:443');
  assert.equal(config.relayRpcUrl, 'https://testnet1.neo.coz.io:443');
  assert.equal(config.n3IndexNetwork, 'testnet');
  assert.equal(config.neoDidDomain, '');
  assert.equal(config.morpheusNetwork, 'testnet');
  assert.equal(config.morpheusApiBaseUrl, 'https://morpheus.meshmini.app/testnet');
});

test('getOperationsRuntime derives collaboration and relay flags', () => {
  const runtime = getOperationsRuntime({
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'anon',
    relayEndpoint: '/api/relay-transaction',
    relayRpcUrl: 'https://rpc.example.org',
    relayMetaEnabled: true,
    relayRawEnabled: false,
    explorerBaseUrl: 'https://testnet.ndoras.com/transaction',
    matrixContractHash: '89908093c5ccc463e2c5744d6bacb06108b60a75',
    n3IndexApiBaseUrl: 'https://api.n3index.dev',
    n3IndexNetwork: 'testnet',
    neoNnsContractHash: '50ac1c37690cc2cfc594472833cf57505d5f46de',
  });

  assert.deepEqual(runtime, {
    collaborationEnabled: true,
    relayEnabled: true,
    relayEndpoint: '/api/relay-transaction',
    relayRpcUrl: 'https://rpc.example.org',
    relayMetaEnabled: true,
    relayRawEnabled: false,
    explorerBaseUrl: 'https://testnet.ndoras.com/transaction',
    matrixContractHash: '89908093c5ccc463e2c5744d6bacb06108b60a75',
    n3IndexApiBaseUrl: 'https://api.n3index.dev',
    n3IndexNetwork: 'testnet',
    neoNnsContractHash: '50ac1c37690cc2cfc594472833cf57505d5f46de',
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'anon',
    broadcastModes: ['client', 'relay'],
  });
});

test('createSupabaseBrowserClient returns null when Supabase env is missing', () => {
  resetSupabaseClientForTests();
  assert.equal(createSupabaseBrowserClient({ supabaseUrl: '', supabaseAnonKey: '' }), null);
});

test('relay transaction function exists and guards missing relay env and invalid payloads', () => {
  const relayPath = path.resolve('api/relay-transaction.js');
  assert.equal(fs.existsSync(relayPath), true, 'expected relay transaction function to exist');
  const source = fs.readFileSync(relayPath, 'utf8');

  assert.match(source, /method_not_allowed/);
  assert.match(source, /relay_not_configured/);
  assert.match(source, /raw_relay_not_enabled/);
  assert.match(source, /missing_raw_transaction/);
  assert.match(source, /invalid_raw_transaction/);
  assert.match(source, /missing_meta_invocation|invalid_meta_invocation/);
  assert.match(source, /AA_RELAY_WIF|relay_signer_not_configured/);
  assert.match(source, /relay_meta_invocation_not_allowed|sanitizeMetaInvocationForRelay/);
  assert.match(source, /CalledByEntry/);
  assert.doesNotMatch(source, /return Array\.isArray\(invocation\.signers\)/);
  assert.match(source, /raw_relay_not_enabled/);
  assert.doesNotMatch(source, /patch_aa_draft_metadata/);
  assert.match(source, /simulate|simulation_not_supported_for_raw|relay_simulation_fault/);
  assert.match(source, /sendrawtransaction/);
  assert.match(source, /import \{ sanitizeHex \} from '\.\.\/src\/utils\/hex\.js';/);
  assert.match(source, /paymaster_authorization_failed/);
  assert.match(source, /phase: failurePhase/);
});
