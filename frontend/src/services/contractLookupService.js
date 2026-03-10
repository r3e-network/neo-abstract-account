import { DEFAULT_N3INDEX_API_BASE_URL, DEFAULT_N3INDEX_NETWORK, RUNTIME_CONFIG } from '@/config/runtimeConfig';
import { sanitizeHex } from '@/utils/hex.js';
import { getScriptHashFromAddress, invokeReadFunction } from '@/utils/neo.js';
import { resolveMatrixDomain } from '@/services/matrixDomainService.js';
import { resolveContractIdentifier } from '@/services/domainResolverService.js';

export const DEFAULT_NEO_NNS_CONTRACT_HASH = '50ac1c37690cc2cfc594472833cf57505d5f46de';
export const DEFAULT_MAINNET_RPC_URL = 'https://mainnet1.neo.coz.io:443';

const CONTRACT_SEARCH_LIMIT = 10;

function trimTrailingSlashes(value = '') {
  return String(value || '').trim().replace(/\/+$/, '');
}

function buildRestUrl(path, searchParams = {}, { apiBaseUrl = RUNTIME_CONFIG.n3IndexApiBaseUrl || DEFAULT_N3INDEX_API_BASE_URL } = {}) {
  const url = new URL(`${trimTrailingSlashes(apiBaseUrl)}${path}`);
  for (const [key, value] of Object.entries(searchParams || {})) {
    if (value == null || value === '') continue;
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function fetchJson(url, fetchImpl = globalThis.fetch) {
  const response = await fetchImpl(url, { headers: { accept: 'application/json' } });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
  }
  return payload;
}

async function fetchContractStateByRpc(contractHash, rpcUrl = RUNTIME_CONFIG.rpcUrl, fetchImpl = globalThis.fetch) {
  const response = await fetchImpl(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getcontractstate',
      params: [`0x${sanitizeHex(contractHash)}`],
    }),
  });

  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.error.message || 'getcontractstate RPC error');
  }
  return payload.result || null;
}

function decodeBase64ToUtf8(value = '') {
  if (!value) return '';
  if (typeof Buffer !== 'undefined') return Buffer.from(value, 'base64').toString('utf8');
  return globalThis.atob ? globalThis.atob(value) : '';
}

export function isContractHash(value = '') {
  return /^[0-9a-f]{40}$/i.test(sanitizeHex(value));
}

export function isNeoDomain(value = '') {
  return String(value || '').trim().toLowerCase().endsWith('.neo');
}

export function isMatrixDomain(value = '') {
  return String(value || '').trim().toLowerCase().endsWith('.matrix');
}

export function isNamedContractLookup(value = '') {
  return isNeoDomain(value) || isMatrixDomain(value);
}

export function buildContractSearchUrl(query, { apiBaseUrl = RUNTIME_CONFIG.n3IndexApiBaseUrl || DEFAULT_N3INDEX_API_BASE_URL, network = RUNTIME_CONFIG.n3IndexNetwork || DEFAULT_N3INDEX_NETWORK, limit = CONTRACT_SEARCH_LIMIT } = {}) {
  return buildRestUrl('/rest/v1/v_contract_overview', {
    network: `eq.${network}`,
    manifest_name: `ilike.*${String(query || '').trim()}*`,
    select: 'contract_hash,manifest_name,last_seen_block',
    order: 'last_seen_block.desc',
    limit: String(limit),
  }, { apiBaseUrl });
}

export function buildContractMetadataSearchUrl(query, { apiBaseUrl = RUNTIME_CONFIG.n3IndexApiBaseUrl || DEFAULT_N3INDEX_API_BASE_URL, network = RUNTIME_CONFIG.n3IndexNetwork || DEFAULT_N3INDEX_NETWORK, limit = CONTRACT_SEARCH_LIMIT } = {}) {
  return buildRestUrl('/rest/v1/contract_metadata_cache', {
    network: `eq.${network}`,
    display_name: `ilike.*${String(query || '').trim()}*`,
    select: 'contract_hash,display_name,updated_at',
    order: 'updated_at.desc',
    limit: String(limit),
  }, { apiBaseUrl });
}

export function buildContractManifestUrl(contractHash, { apiBaseUrl = RUNTIME_CONFIG.n3IndexApiBaseUrl || DEFAULT_N3INDEX_API_BASE_URL, network = RUNTIME_CONFIG.n3IndexNetwork || DEFAULT_N3INDEX_NETWORK } = {}) {
  return buildRestUrl('/rest/v1/contracts', {
    network: `eq.${network}`,
    contract_hash: `eq.0x${sanitizeHex(contractHash)}`,
    select: 'contract_hash,manifest',
    limit: '1',
  }, { apiBaseUrl });
}

export function buildRelatedContractsUrl(addressScriptHash, { apiBaseUrl = RUNTIME_CONFIG.n3IndexApiBaseUrl || DEFAULT_N3INDEX_API_BASE_URL, network = RUNTIME_CONFIG.n3IndexNetwork || DEFAULT_N3INDEX_NETWORK, limit = CONTRACT_SEARCH_LIMIT } = {}) {
  return buildRestUrl('/rest/v1/v_account_contract_interactions', {
    network: `eq.${network}`,
    address: `eq.0x${sanitizeHex(addressScriptHash)}`,
    select: 'contract_hash,tx_count,last_seen_ms',
    order: 'tx_count.desc',
    limit: String(limit),
  }, { apiBaseUrl });
}

export function buildContractOverviewByHashesUrl(contractHashes = [], { apiBaseUrl = RUNTIME_CONFIG.n3IndexApiBaseUrl || DEFAULT_N3INDEX_API_BASE_URL, network = RUNTIME_CONFIG.n3IndexNetwork || DEFAULT_N3INDEX_NETWORK } = {}) {
  const normalized = [...new Set((contractHashes || []).map((item) => `0x${sanitizeHex(item)}`).filter((item) => item !== '0x'))];
  return buildRestUrl('/rest/v1/v_contract_overview', {
    network: `eq.${network}`,
    contract_hash: `in.(${normalized.join(',')})`,
    select: 'contract_hash,manifest_name,last_seen_block',
    order: 'last_seen_block.desc',
  }, { apiBaseUrl });
}

export function extractMethodOptions(manifest) {
  const methods = Array.isArray(manifest?.abi?.methods) ? manifest.abi.methods : [];
  return methods
    .filter((item) => item && item.name && !String(item.name).startsWith('_'))
    .map((item) => ({
      name: String(item.name),
      parameters: Array.isArray(item.parameters) ? item.parameters : [],
      safe: Boolean(item.safe),
      returntype: item.returntype || 'Void',
    }));
}

export function createParameterDefinitions(methodOption = null) {
  const parameters = Array.isArray(methodOption?.parameters) ? methodOption.parameters : [];
  return parameters.map((parameter, index) => ({
    key: `${parameter.name || 'param'}-${index}`,
    index,
    name: parameter.name || `param${index + 1}`,
    type: parameter.type || 'Any',
  }));
}

function parseBoolean(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function safeParseJson(value, fallback) {
  try {
    return JSON.parse(String(value || '').trim());
  } catch {
    return fallback;
  }
}

function utf8ToHex(value = '') {
  return Array.from(new TextEncoder().encode(String(value || ''))).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function buildContractParamFromDefinition(definition, rawValue = '') {
  const type = String(definition?.type || 'Any');
  const normalized = String(rawValue ?? '').trim();

  if (type === 'Hash160') {
    if (!normalized) return { type: 'Hash160', value: '0x' };
    try {
      const hash = normalized.startsWith('N') ? sanitizeHex(getScriptHashFromAddress(normalized)) : sanitizeHex(normalized);
      return { type: 'Hash160', value: `0x${hash}` };
    } catch {
      return { type: 'Hash160', value: normalized };
    }
  }

  if (type === 'Integer') return { type: 'Integer', value: normalized || '0' };
  if (type === 'Boolean') return { type: 'Boolean', value: parseBoolean(normalized) };
  if (type === 'String') return { type: 'String', value: String(rawValue ?? '') };
  if (type === 'ByteArray' || type === 'ByteString') {
    if (!normalized) return { type, value: '0x' };
    if (normalized.startsWith('0x')) return { type, value: `0x${sanitizeHex(normalized)}` };
    return { type, value: `0x${utf8ToHex(normalized)}` };
  }

  if (type === 'Array') {
    const parsed = safeParseJson(normalized, []);
    return { type: 'Array', value: Array.isArray(parsed) ? parsed : [] };
  }

  const parsed = safeParseJson(normalized, null);
  if (parsed && typeof parsed === 'object' && parsed.type) return parsed;
  return { type, value: normalized };
}

export function buildArgsTextFromDefinitions(parameterDefinitions = [], parameterValues = {}) {
  return JSON.stringify(
    parameterDefinitions.map((definition) => buildContractParamFromDefinition(definition, parameterValues[definition.key] ?? '')),
    null,
    2,
  );
}

export function hydrateParameterValues(parameterDefinitions = [], argsText = '[]') {
  const parsed = safeParseJson(argsText, []);
  const values = {};
  parameterDefinitions.forEach((definition, index) => {
    const arg = Array.isArray(parsed) ? parsed[index] : null;
    if (!arg || typeof arg !== 'object') {
      values[definition.key] = '';
      return;
    }
    if (arg.type === 'Boolean') {
      values[definition.key] = arg.value ? 'true' : 'false';
      return;
    }
    if (arg.type === 'Array') {
      values[definition.key] = JSON.stringify(arg.value || [], null, 2);
      return;
    }
    values[definition.key] = typeof arg.value === 'string' ? arg.value : JSON.stringify(arg.value ?? '', null, 2);
  });
  return values;
}

export async function searchContractsByName(query, { apiBaseUrl = RUNTIME_CONFIG.n3IndexApiBaseUrl || DEFAULT_N3INDEX_API_BASE_URL, baseUrl, network = RUNTIME_CONFIG.n3IndexNetwork || DEFAULT_N3INDEX_NETWORK, fetchImpl } = {}) {
  const effectiveApiBaseUrl = baseUrl || apiBaseUrl;
  const trimmed = String(query || '').trim();
  if (trimmed.length < 2) return [];

  const [overviewResults, metadataResults] = await Promise.all([
    fetchJson(buildContractSearchUrl(trimmed, { apiBaseUrl: effectiveApiBaseUrl, network }), fetchImpl),
    fetchJson(buildContractMetadataSearchUrl(trimmed, { apiBaseUrl: effectiveApiBaseUrl, network }), fetchImpl),
  ]);

  const merged = new Map();
  for (const item of overviewResults || []) {
    merged.set(sanitizeHex(item.contract_hash), {
      contractHash: sanitizeHex(item.contract_hash),
      displayName: item.manifest_name || 'Unknown Contract',
      detail: `Manifest name · block ${item.last_seen_block ?? 'n/a'}`,
      source: 'name',
    });
  }
  for (const item of metadataResults || []) {
    const hash = sanitizeHex(item.contract_hash);
    const existing = merged.get(hash) || { contractHash: hash, source: 'name' };
    merged.set(hash, {
      ...existing,
      displayName: item.display_name || existing.displayName || 'Unknown Contract',
      detail: existing.detail || 'Metadata cache match',
    });
  }

  return [...merged.values()].slice(0, CONTRACT_SEARCH_LIMIT);
}

export async function loadContractMethodsByHash(contractHash, { apiBaseUrl = RUNTIME_CONFIG.n3IndexApiBaseUrl || DEFAULT_N3INDEX_API_BASE_URL, network = RUNTIME_CONFIG.n3IndexNetwork || DEFAULT_N3INDEX_NETWORK, rpcUrl = RUNTIME_CONFIG.rpcUrl, fetchImpl } = {}) {
  const normalizedHash = sanitizeHex(contractHash);
  if (!isContractHash(normalizedHash)) {
    return { contractHash: '', displayName: '', manifest: null, methodOptions: [] };
  }

  let manifest = null;
  try {
    const contractEntries = await fetchJson(buildContractManifestUrl(normalizedHash, { apiBaseUrl, network }), fetchImpl);
    manifest = Array.isArray(contractEntries) ? contractEntries[0]?.manifest || null : null;
  } catch (_error) {
    manifest = null;
  }

  if (!manifest) {
    const rpcState = await fetchContractStateByRpc(normalizedHash, rpcUrl, fetchImpl);
    manifest = rpcState?.manifest || null;
  }

  const methodOptions = extractMethodOptions(manifest);

  return {
    contractHash: normalizedHash,
    displayName: manifest?.name || normalizedHash,
    manifest,
    methodOptions,
  };
}

export async function resolveNeoDomain(domain, { rpcUrl = DEFAULT_MAINNET_RPC_URL, contractHash = DEFAULT_NEO_NNS_CONTRACT_HASH, fetchImpl } = {}) {
  const normalized = String(domain || '').trim().toLowerCase();
  if (!isNeoDomain(normalized)) return '';
  const result = await invokeReadFunction(rpcUrl, sanitizeHex(contractHash), 'resolve', [
    { type: 'String', value: normalized },
    { type: 'Integer', value: 16 },
  ], fetchImpl);
  const item = result?.stack?.[0];
  if (item?.type !== 'ByteString' || !item.value) return '';
  const decoded = decodeBase64ToUtf8(item.value);
  return decoded && decoded.startsWith('N') ? decoded : '';
}

export async function searchContractsByDomain(domain, { apiBaseUrl = RUNTIME_CONFIG.n3IndexApiBaseUrl || DEFAULT_N3INDEX_API_BASE_URL, network = RUNTIME_CONFIG.n3IndexNetwork || DEFAULT_N3INDEX_NETWORK, rpcUrl = RUNTIME_CONFIG.rpcUrl, matrixContractHash = RUNTIME_CONFIG.matrixContractHash, fetchImpl } = {}) {
  const normalized = String(domain || '').trim().toLowerCase();
  const resolvedAddress = isMatrixDomain(normalized)
    ? await resolveMatrixDomain(normalized, { rpcUrl, matrixContractHash })
    : await resolveNeoDomain(normalized, { fetchImpl });

  if (!resolvedAddress) {
    return { resolvedAddress: '', candidates: [] };
  }

  const addressScriptHash = sanitizeHex(getScriptHashFromAddress(resolvedAddress));
  const interactions = await fetchJson(buildRelatedContractsUrl(addressScriptHash, { apiBaseUrl, network }), fetchImpl);
  const contractHashes = [...new Set((interactions || []).map((item) => sanitizeHex(item.contract_hash)).filter(Boolean))];
  if (!contractHashes.length) {
    return { resolvedAddress, candidates: [] };
  }

  const overviews = await fetchJson(buildContractOverviewByHashesUrl(contractHashes, { apiBaseUrl, network }), fetchImpl);
  const byHash = new Map((overviews || []).map((item) => [sanitizeHex(item.contract_hash), item]));
  const candidates = contractHashes.map((hash) => {
    const overview = byHash.get(hash);
    const interaction = (interactions || []).find((item) => sanitizeHex(item.contract_hash) === hash);
    return {
      contractHash: hash,
      displayName: overview?.manifest_name || hash,
      detail: `Domain match · ${interaction?.tx_count || 0} interactions`,
      source: 'domain',
    };
  });

  return { resolvedAddress, candidates };
}

export async function resolveContractCandidates(query, options = {}) {
  const trimmed = String(query || '').trim();
  if (!trimmed) return { mode: 'empty', resolvedAddress: '', candidates: [] };
  if (isNamedContractLookup(trimmed)) {
    const result = await searchContractsByDomain(trimmed, options);
    return { mode: 'domain', ...result };
  }
  const candidates = await searchContractsByName(trimmed, options);
  return { mode: 'name', resolvedAddress: '', candidates };
}

export function buildParameterFields(methodOption = null) {
  return createParameterDefinitions(methodOption).map((definition) => ({
    ...definition,
    value: definition.type === 'Boolean' ? false : (['Array', 'Map', 'Any'].includes(String(definition.type)) ? '[]' : ''),
  }));
}

export function buildContractParamFromField(field = {}) {
  return buildContractParamFromDefinition(field, field?.value ?? '');
}

export async function loadContractManifest(identifier, { apiBaseUrl = RUNTIME_CONFIG.n3IndexApiBaseUrl || DEFAULT_N3INDEX_API_BASE_URL, network = RUNTIME_CONFIG.n3IndexNetwork || DEFAULT_N3INDEX_NETWORK, rpcUrl = RUNTIME_CONFIG.rpcUrl, matrixContractHash = RUNTIME_CONFIG.matrixContractHash, neoNnsContractHash = RUNTIME_CONFIG.neoNnsContractHash, fetchImpl } = {}) {
  const resolved = await resolveContractIdentifier(identifier, { rpcUrl, matrixContractHash, neoNnsContractHash, fetchImpl });
  if (!resolved.contractHash) {
    return { resolved, contractState: null, manifest: null, methods: [] };
  }
  const effectiveNetwork = resolved.kind === 'neo-domain' ? 'mainnet' : network;
  const effectiveRpcUrl = resolved.kind === 'neo-domain' ? DEFAULT_MAINNET_RPC_URL : rpcUrl;
  const loaded = await loadContractMethodsByHash(resolved.contractHash, { apiBaseUrl, network: effectiveNetwork, rpcUrl: effectiveRpcUrl, fetchImpl });
  return {
    resolved,
    contractState: loaded.manifest ? { manifest: loaded.manifest } : null,
    manifest: loaded.manifest,
    methods: loaded.methodOptions || [],
  };
}
