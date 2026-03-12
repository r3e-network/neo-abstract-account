import { sanitizeHex } from '../utils/hex.js';

export { sanitizeHex };

export const DEFAULT_ABSTRACT_ACCOUNT_HASH = '0466fa7e8fe548480d7978d2652625d4a22589a6';
export const DEFAULT_RPC_URL = 'https://mainnet1.neo.coz.io:443';
export const DEFAULT_RELAY_ENDPOINT = '/api/relay-transaction';
export const DEFAULT_EXPLORER_BASE_URL = 'https://neotube.io/tx/';
export const DEFAULT_MATRIX_CONTRACT_HASH = '89908093c5ccc463e2c5744d6bacb06108b60a75';
export const DEFAULT_N3INDEX_API_BASE_URL = 'https://api.n3index.dev';
export const DEFAULT_N3INDEX_NETWORK = 'mainnet';
export const DEFAULT_NEO_NNS_CONTRACT_HASH = '50ac1c37690cc2cfc594472833cf57505d5f46de';
export const DEFAULT_WEB3AUTH_NETWORK = 'sapphire_mainnet';
export const DEFAULT_WEB3AUTH_CHAIN_NAMESPACE = 'eip155';
export const DEFAULT_WEB3AUTH_CHAIN_ID = '0x1';
export const DEFAULT_WEB3AUTH_RPC_TARGET = 'https://rpc.ankr.com/eth';
export const DEFAULT_WEB3AUTH_PROJECT_NAME = 'DID.Morpheus';
export const DEFAULT_DID_PROVIDER = 'web3auth';
export const DEFAULT_ABSTRACT_ACCOUNT_DOMAIN = 'aa.morpheus.neo';
export const DEFAULT_NEODID_DOMAIN = 'neodid.morpheus.neo';
export const DEFAULT_MORPHEUS_API_BASE_URL = 'https://neo-morpheus-oracle-web.vercel.app';
export const DEFAULT_MORPHEUS_NEODID_SERVICE_DID = 'did:morpheus:neo_n3:service:neodid';

export function resolveAbstractAccountHash(value, fallback = DEFAULT_ABSTRACT_ACCOUNT_HASH) {
  const normalized = sanitizeHex(value);
  if (!/^[0-9a-f]{40}$/.test(normalized)) return fallback;
  return normalized;
}

export function resolveRpcUrl(value, fallback = DEFAULT_RPC_URL) {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

export function resolveOptionalUrl(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

export function resolveOptionalToken(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

export function resolveOptionalNetwork(value, fallback = DEFAULT_N3INDEX_NETWORK) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'mainnet' || normalized === 'testnet') return normalized;
  return fallback;
}

export function resolveOptionalBoolean(value, fallback = false) {
  if (value == null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) return false;
  return fallback;
}

export function getRuntimeConfig(env = import.meta.env ?? {}) {
  return {
    abstractAccountHash: resolveAbstractAccountHash(
      env.VITE_AA_HASH || env.VITE_ABSTRACT_ACCOUNT_HASH,
      DEFAULT_ABSTRACT_ACCOUNT_HASH
    ),
    abstractAccountDomain: resolveOptionalUrl(
      env.VITE_AA_DOMAIN || env.VITE_ABSTRACT_ACCOUNT_DOMAIN,
      DEFAULT_ABSTRACT_ACCOUNT_DOMAIN
    ),
    rpcUrl: resolveRpcUrl(
      env.VITE_AA_RPC_URL || env.VITE_NEO_RPC_URL,
      DEFAULT_RPC_URL
    ),
    supabaseUrl: resolveOptionalUrl(
      env.VITE_SUPABASE_URL || env.VITE_SUPABASE_PROJECT_URL
    ),
    supabaseAnonKey: resolveOptionalToken(
      env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY
    ),
    relayEndpoint: resolveOptionalUrl(
      env.VITE_AA_RELAY_URL || env.VITE_RELAY_ENDPOINT,
      DEFAULT_RELAY_ENDPOINT
    ),
    relayRpcUrl: resolveOptionalUrl(
      env.VITE_AA_RELAY_RPC_URL || env.VITE_NEO_RPC_URL || env.VITE_AA_RPC_URL,
      DEFAULT_RPC_URL
    ),
    relayMetaEnabled: resolveOptionalBoolean(
      env.VITE_AA_RELAY_META_ENABLED || env.VITE_RELAY_META_ENABLED,
      false
    ),
    relayRawEnabled: resolveOptionalBoolean(
      env.VITE_AA_RELAY_RAW_ENABLED || env.VITE_RELAY_RAW_ENABLED,
      false
    ),
    explorerBaseUrl: resolveOptionalUrl(
      env.VITE_AA_EXPLORER_BASE_URL || env.VITE_EXPLORER_BASE_URL,
      DEFAULT_EXPLORER_BASE_URL
    ),
    matrixContractHash: resolveAbstractAccountHash(
      env.VITE_AA_MATRIX_CONTRACT_HASH || env.VITE_MATRIX_CONTRACT_HASH || env.VITE_MATRIX_CONTRACT_HASH_TESTNET,
      DEFAULT_MATRIX_CONTRACT_HASH
    ),
    n3IndexApiBaseUrl: resolveOptionalUrl(
      env.VITE_AA_N3INDEX_API_BASE_URL || env.VITE_N3INDEX_API_BASE_URL,
      DEFAULT_N3INDEX_API_BASE_URL
    ),
    n3IndexNetwork: resolveOptionalNetwork(
      env.VITE_AA_N3INDEX_NETWORK || env.VITE_N3INDEX_NETWORK,
      DEFAULT_N3INDEX_NETWORK
    ),
    neoNnsContractHash: resolveAbstractAccountHash(
      env.VITE_AA_NEO_NNS_CONTRACT_HASH || env.VITE_NEO_NNS_CONTRACT_HASH,
      DEFAULT_NEO_NNS_CONTRACT_HASH
    ),
    web3AuthClientId: resolveOptionalToken(
      env.VITE_WEB3AUTH_CLIENT_ID
    ),
    web3AuthProjectName: resolveOptionalUrl(
      env.VITE_WEB3AUTH_PROJECT_NAME,
      DEFAULT_WEB3AUTH_PROJECT_NAME
    ),
    web3AuthNetwork: resolveOptionalUrl(
      env.VITE_WEB3AUTH_NETWORK,
      DEFAULT_WEB3AUTH_NETWORK
    ),
    web3AuthChainNamespace: resolveOptionalUrl(
      env.VITE_WEB3AUTH_CHAIN_NAMESPACE,
      DEFAULT_WEB3AUTH_CHAIN_NAMESPACE
    ),
    web3AuthChainId: resolveOptionalUrl(
      env.VITE_WEB3AUTH_CHAIN_ID,
      DEFAULT_WEB3AUTH_CHAIN_ID
    ),
    web3AuthRpcTarget: resolveOptionalUrl(
      env.VITE_WEB3AUTH_RPC_TARGET,
      DEFAULT_WEB3AUTH_RPC_TARGET
    ),
    web3AuthRedirectUrl: resolveOptionalUrl(
      env.VITE_WEB3AUTH_REDIRECT_URL
    ),
    web3AuthEmailLoginEnabled: resolveOptionalBoolean(
      env.VITE_WEB3AUTH_EMAIL_LOGIN_ENABLED,
      true
    ),
    web3AuthSmsLoginEnabled: resolveOptionalBoolean(
      env.VITE_WEB3AUTH_SMS_LOGIN_ENABLED,
      true
    ),
    neoDidProvider: resolveOptionalUrl(
      env.VITE_NEODID_PROVIDER,
      DEFAULT_DID_PROVIDER
    ),
    neoDidDomain: resolveOptionalUrl(
      env.VITE_NEODID_DOMAIN,
      DEFAULT_NEODID_DOMAIN
    ),
    morpheusApiBaseUrl: resolveOptionalUrl(
      env.VITE_MORPHEUS_API_BASE_URL,
      DEFAULT_MORPHEUS_API_BASE_URL
    ),
    morpheusNeoDidServiceDid: resolveOptionalUrl(
      env.VITE_MORPHEUS_NEODID_SERVICE_DID,
      DEFAULT_MORPHEUS_NEODID_SERVICE_DID
    ),
    didVerificationEndpoint: resolveOptionalUrl(
      env.VITE_DID_VERIFICATION_ENDPOINT,
      '/api/did-verify'
    ),
    didNotificationEndpoint: resolveOptionalUrl(
      env.VITE_DID_NOTIFICATION_ENDPOINT,
      '/api/did-notify'
    ),
    morpheusNeoDidEndpoint: resolveOptionalUrl(
      env.VITE_MORPHEUS_NEODID_ENDPOINT,
      '/api/morpheus-neodid'
    ),
    morpheusNeoDidResolveEndpoint: resolveOptionalUrl(
      env.VITE_MORPHEUS_NEODID_RESOLVE_ENDPOINT,
      '/api/morpheus-neodid?action=resolve'
    ),
    morpheusOracleKeyEndpoint: resolveOptionalUrl(
      env.VITE_MORPHEUS_ORACLE_KEY_ENDPOINT,
      '/api/morpheus-oracle-public-key'
    ),
    didNotificationEmailEnabled: resolveOptionalBoolean(
      env.VITE_DID_NOTIFICATION_EMAIL_ENABLED,
      true
    ),
    didNotificationSmsEnabled: resolveOptionalBoolean(
      env.VITE_DID_NOTIFICATION_SMS_ENABLED,
      true
    ),
  };
}

export const RUNTIME_CONFIG = getRuntimeConfig();
