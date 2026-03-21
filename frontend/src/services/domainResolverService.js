import { EC } from '../config/errorCodes.js';
import { RUNTIME_CONFIG } from '@/config/runtimeConfig';
import { getScriptHashFromAddress, invokeReadFunction } from '@/utils/neo.js';
import { sanitizeHex } from '@/utils/hex.js';
import { isMatrixDomain, normalizeMatrixDomain, resolveMatrixDomain } from '@/services/matrixDomainService.js';

export const NEO_SUFFIX = '.neo';
export const DEFAULT_MAINNET_RPC_URL = 'https://mainnet1.neo.coz.io:443';
export const DEFAULT_NEO_NNS_CONTRACT_HASH = '50ac1c37690cc2cfc594472833cf57505d5f46de';

export function isNeoDomain(value = '') {
  return String(value || '').trim().toLowerCase().endsWith(NEO_SUFFIX);
}

export function normalizeNeoDomain(value = '') {
  let normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (!normalized.endsWith(NEO_SUFFIX)) normalized += NEO_SUFFIX;
  return normalized;
}

function decodeBase64ToUtf8(value) {
  if (!value) return '';
  if (typeof Buffer !== 'undefined') return Buffer.from(value, 'base64').toString('utf8');
  return globalThis.atob ? globalThis.atob(value) : '';
}

export async function resolveNeoDomain(
  domain,
  {
    rpcUrl = DEFAULT_MAINNET_RPC_URL,
    neoNnsContractHash = RUNTIME_CONFIG.neoNnsContractHash || DEFAULT_NEO_NNS_CONTRACT_HASH,
    fetchImpl,
  } = {},
) {
  const normalized = normalizeNeoDomain(domain);
  if (!normalized) return '';

  const result = await invokeReadFunction(
    rpcUrl,
    sanitizeHex(neoNnsContractHash),
    'resolve',
    [
      { type: 'String', value: normalized },
      { type: 'Integer', value: 16 },
    ],
    fetchImpl,
  );

  if (result?.state === 'FAULT') {
    const err = new Error(EC.nnsResolveFault);
    err.rpcDetail = result.exception || null;
    throw err;
  }

  const item = result?.stack?.[0];
  if (item?.type !== 'ByteString' || !item.value) return '';
  const decoded = decodeBase64ToUtf8(item.value);
  return decoded && decoded.startsWith('N') && decoded.length === 34 ? decoded : '';
}

export async function resolveContractIdentifier(
  identifier,
  {
    rpcUrl = RUNTIME_CONFIG.rpcUrl,
    matrixContractHash = RUNTIME_CONFIG.matrixContractHash,
    neoNnsContractHash = RUNTIME_CONFIG.neoNnsContractHash,
    fetchImpl,
  } = {},
) {
  const raw = String(identifier || '').trim();
  if (!raw) {
    return { kind: 'empty', raw, contractHash: '', address: '', domain: '', displayName: '' };
  }

  if (isMatrixDomain(raw)) {
    const address = await resolveMatrixDomain(raw, { rpcUrl, matrixContractHash, fetchImpl });
    return {
      kind: 'matrix-domain',
      raw,
      domain: normalizeMatrixDomain(raw),
      address,
      contractHash: address ? sanitizeHex(getScriptHashFromAddress(address)) : '',
      displayName: normalizeMatrixDomain(raw),
    };
  }

  if (isNeoDomain(raw)) {
    const address = await resolveNeoDomain(raw, { neoNnsContractHash, fetchImpl });
    return {
      kind: 'neo-domain',
      raw,
      domain: normalizeNeoDomain(raw),
      address,
      contractHash: address ? sanitizeHex(getScriptHashFromAddress(address)) : '',
      displayName: normalizeNeoDomain(raw),
    };
  }

  if (raw.startsWith('N')) {
    return {
      kind: 'address',
      raw,
      domain: '',
      address: raw,
      contractHash: sanitizeHex(getScriptHashFromAddress(raw)),
      displayName: raw,
    };
  }

  const contractHash = sanitizeHex(raw);
  if (/^[0-9a-f]{40}$/.test(contractHash)) {
    return {
      kind: 'hash',
      raw,
      domain: '',
      address: '',
      contractHash,
      displayName: contractHash,
    };
  }

  return {
    kind: 'name',
    raw,
    domain: '',
    address: '',
    contractHash: '',
    displayName: raw,
  };
}
