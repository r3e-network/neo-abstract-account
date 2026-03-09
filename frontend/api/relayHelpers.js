import { sanitizeHex } from '../src/utils/hex.js';

export const ALLOWED_RELAY_META_OPERATIONS = ['executeMetaTx', 'executeMetaTxByAddress'];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function isValidMetaInvocation(input = {}) {
  return Boolean(
    input
    && typeof input === 'object'
    && sanitizeHex(input.scriptHash || '').length === 40
    && String(input.operation || '').trim()
    && Array.isArray(input.args)
  );
}

export function sanitizeMetaInvocationForRelay(input = {}, { aaContractHash = '' } = {}) {
  if (!isValidMetaInvocation(input)) return null;

  const scriptHash = sanitizeHex(input.scriptHash || '');
  const allowedHash = sanitizeHex(aaContractHash || '');
  const operation = String(input.operation || '').trim();

  if (allowedHash && scriptHash !== allowedHash) return null;
  if (!ALLOWED_RELAY_META_OPERATIONS.includes(operation)) return null;

  return {
    scriptHash,
    operation,
    args: asArray(input.args).map((item) => item && typeof item === 'object'
      ? JSON.parse(JSON.stringify(item))
      : item),
  };
}

export function normalizeRelayPayload(body = {}) {
  const rawTransaction = typeof body?.rawTransaction === 'string'
    ? body.rawTransaction
    : typeof body?.raw_transaction === 'string'
      ? body.raw_transaction
      : '';

  if (rawTransaction) {
    return {
      mode: 'raw',
      rawTransaction: sanitizeHex(rawTransaction),
    };
  }

  const metaInvocation = body?.metaInvocation || body?.meta_invocation || null;
  if (isValidMetaInvocation(metaInvocation)) {
    return {
      mode: 'meta',
      metaInvocation,
    };
  }

  return {
    mode: 'invalid',
    rawTransaction: '',
    metaInvocation: null,
  };
}

export function convertContractParamFromJson(param, { sc, u } = {}) {
  if (!param || typeof param !== 'object') {
    return sc.ContractParam.any(null);
  }

  switch (param.type) {
    case 'Hash160':
      return sc.ContractParam.hash160(sanitizeHex(param.value));
    case 'String':
      return sc.ContractParam.string(String(param.value || ''));
    case 'Integer':
      return sc.ContractParam.integer(param.value);
    case 'ByteArray':
      return sc.ContractParam.byteArray(u.HexString.fromHex(sanitizeHex(param.value), true));
    case 'Array':
      return sc.ContractParam.array(...asArray(param.value).map((item) => convertContractParamFromJson(item, { sc, u })));
    case 'Any':
      return sc.ContractParam.any(param.value ?? null);
    case 'Boolean':
      return sc.ContractParam.bool(Boolean(param.value));
    default:
      return sc.ContractParam.any(param.value ?? null);
  }
}
