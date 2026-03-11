import { sanitizeHex } from '../utils/hex.js';

export { sanitizeHex };

export const DEFAULT_ABSTRACT_ACCOUNT_HASH = '5be915aea3ce85e4752d522632f0a9520e377aaf';
export const DEFAULT_RPC_URL = 'https://testnet1.neo.coz.io:443';
export const DEFAULT_RELAY_ENDPOINT = '/api/relay-transaction';
export const DEFAULT_EXPLORER_BASE_URL = 'https://testnet.ndoras.com/transaction';
export const DEFAULT_MATRIX_CONTRACT_HASH = '89908093c5ccc463e2c5744d6bacb06108b60a75';
export const DEFAULT_N3INDEX_API_BASE_URL = 'https://api.n3index.dev';
export const DEFAULT_N3INDEX_NETWORK = 'testnet';
export const DEFAULT_NEO_NNS_CONTRACT_HASH = '50ac1c37690cc2cfc594472833cf57505d5f46de';

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
  };
}

export const RUNTIME_CONFIG = getRuntimeConfig();
