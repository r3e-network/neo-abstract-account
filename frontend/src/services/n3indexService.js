import { RUNTIME_CONFIG } from '@/config/runtimeConfig';

export const TESTNET_SUMMARY_PATH = '/indexer/v1/networks/testnet/summary';
export const TESTNET_STATUS_PATH = '/indexer/v1/networks/testnet/status';

function trimTrailingSlash(value = '') {
  return String(value || '').trim().replace(/\/+$/, '');
}

export function buildN3IndexUrl(path, { baseUrl = RUNTIME_CONFIG.n3IndexApiBaseUrl } = {}) {
  const normalizedBaseUrl = trimTrailingSlash(baseUrl);
  const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${String(path || '')}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
}

async function fetchJson(url, { fetchImpl = globalThis.fetch } = {}) {
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`N3Index request failed with HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchTestnetSummary({ baseUrl = RUNTIME_CONFIG.n3IndexApiBaseUrl, fetchImpl } = {}) {
  return fetchJson(buildN3IndexUrl(TESTNET_SUMMARY_PATH, { baseUrl }), { fetchImpl });
}

export async function fetchTestnetStatus({ baseUrl = RUNTIME_CONFIG.n3IndexApiBaseUrl, fetchImpl } = {}) {
  return fetchJson(buildN3IndexUrl(TESTNET_STATUS_PATH, { baseUrl }), { fetchImpl });
}
