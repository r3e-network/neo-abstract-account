import { sanitizeHex } from '../../utils/hex.js';
import { getScriptHashFromAddress } from '../../utils/neo.js';

export { sanitizeHex };


export function sanitizeList(items = []) {
  return items
    .map((value) => String(value || '').trim())
    .filter((value) => value.length > 0);
}

export function addListRow(listRef) {
  listRef.push('');
}

export function removeListRow(listRef, index) {
  if (index < 0 || index >= listRef.length) return;
  listRef.splice(index, 1);
}

export function createGeneratedAccountId() {
  const timestamp = Date.now().toString(16);
  const randomId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, '')
    : Math.random().toString(16).slice(2).padEnd(32, '0');
  return `${timestamp}-${randomId}`.substring(0, 32);
}

export function normalizeAccountId(value, isEvmWallet) {
  if (isEvmWallet && /^[0-9a-fA-F]{130}$/.test(value)) {
    return value;
  }

  let hex = '';
  for (let i = 0; i < value.length; i++) {
    hex += value.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
}

export function normalizeAddress(input) {
  const value = String(input || '').trim();
  if (!value) return value;

  if (value.startsWith('N') && value.length === 34) {
    return getScriptHashFromAddress(value);
  }
  if (value.startsWith('0x')) {
    return value.slice(2);
  }
  return value;
}

export function hash160Param(value) {
  const normalized = normalizeAddress(value);
  if (!/^[0-9a-fA-F]{40}$/.test(normalized)) {
    throw new Error(`Invalid address format: ${value}`);
  }
  return normalized;
}

export function toHashArray(values) {
  return values.map((value) => ({ type: 'Hash160', value: hash160Param(value) }));
}


export function base64ToHex(base64Value) {
  if (!base64Value) return '';
  try {
    const binary = atob(base64Value);
    let hex = '';
    for (let i = 0; i < binary.length; i++) {
      hex += binary.charCodeAt(i).toString(16).padStart(2, '0');
    }
    return hex.toLowerCase();
  } catch (_) {
    return '';
  }
}

export function decodeStackInteger(item) {
  if (!item || typeof item !== 'object') return 0;
  if (item.type === 'Integer') {
    const parsed = Number(item.value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (item.type === 'Boolean') {
    return item.value ? 1 : 0;
  }
  return 0;
}

export function decodeStackBoolean(item) {
  if (!item || typeof item !== 'object') return false;
  if (item.type === 'Boolean') return !!item.value;
  if (item.type === 'Integer') return Number(item.value) !== 0;
  if (item.type === 'ByteString') {
    const hex = base64ToHex(item.value);
    return hex === '01' || hex === '31';
  }
  return false;
}

export function decodeStackByteStringHex(item) {
  if (!item || typeof item !== 'object') return '';
  if (item.type === 'ByteString') return base64ToHex(item.value);
  return '';
}

export function decodeStackHash160(item) {
  if (!item || typeof item !== 'object') return '';
  if (item.type === 'Hash160') return sanitizeHex(item.value);
  if (item.type === 'ByteString') return sanitizeHex(base64ToHex(item.value));
  return '';
}

export function decodeStackHashArray(item) {
  if (!item || item.type !== 'Array' || !Array.isArray(item.value)) return [];
  return item.value.map((entry) => decodeStackHash160(entry)).filter((entry) => !!entry);
}

export function normalizeThreshold(rawValue, maxMembers, fallbackForEmpty) {
  if (maxMembers <= 0) return fallbackForEmpty;
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < 1) return 1;
  if (value > maxMembers) return maxMembers;
  return value;
}

export function resolveRpcUrl(walletService) {
  const fromWalletService = walletService?.rpcUrl
    || walletService?.network?.rpcUrl
    || walletService?.network?.rpc
    || walletService?.providerRpc;
  return fromWalletService || 'https://testnet1.neo.coz.io:443';
}

export function formatErrorMessage(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  return err.description || err.message || err.error?.message || JSON.stringify(err);
}

export function isPositiveNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
}

export function parseRecentTransactions(raw, fallback = []) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return parsed
      .filter((item) => item && typeof item === 'object')
      .filter((item) => typeof item.txid === 'string' && item.txid.length > 0)
      .map((item) => ({
        label: String(item.label || 'Transaction'),
        txid: String(item.txid),
        when: String(item.when || new Date().toLocaleString())
      }));
  } catch (_) {
    return fallback;
  }
}
