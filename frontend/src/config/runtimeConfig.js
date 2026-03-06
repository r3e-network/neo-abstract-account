export const DEFAULT_ABSTRACT_ACCOUNT_HASH = '711c1899a3b7fa0e055ae0d17c9acfcd1bef6423';
export const DEFAULT_RPC_URL = 'https://testnet1.neo.coz.io:443';

export function sanitizeHex(value) {
  return String(value || '').replace(/^0x/i, '').toLowerCase();
}

export function resolveAbstractAccountHash(value, fallback = DEFAULT_ABSTRACT_ACCOUNT_HASH) {
  const normalized = sanitizeHex(value);
  if (!/^[0-9a-f]{40}$/.test(normalized)) return fallback;
  return normalized;
}

export function resolveRpcUrl(value, fallback = DEFAULT_RPC_URL) {
  const normalized = String(value || '').trim();
  return normalized || fallback;
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
    )
  };
}

export const RUNTIME_CONFIG = getRuntimeConfig();
