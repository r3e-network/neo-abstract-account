import { ethers } from 'ethers';
import { sanitizeHex } from './hex.js';

export const DEFAULT_NEO_ADDRESS_VERSION = 53;
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_INDEX = new Map([...BASE58_ALPHABET].map((char, index) => [char, index]));

function hexToBytes(hexValue) {
  const hex = sanitizeHex(hexValue);
  if (hex.length % 2 !== 0) {
    throw new Error(`Invalid hex length: ${hex.length}`);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function concatBytes(...chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function sha256Bytes(bytes) {
  return hexToBytes(ethers.sha256(bytes));
}

function doubleSha256Bytes(bytes) {
  return sha256Bytes(sha256Bytes(bytes));
}

function hash160Hex(hexValue) {
  const bytes = hexToBytes(hexValue);
  const sha = sha256Bytes(bytes);
  return sanitizeHex(ethers.ripemd160(sha));
}

function encodeBase58(bytes) {
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) + BigInt(byte);
  }

  let output = '';
  while (value > 0n) {
    const remainder = Number(value % 58n);
    output = BASE58_ALPHABET[remainder] + output;
    value /= 58n;
  }

  for (let index = 0; index < bytes.length && bytes[index] === 0; index += 1) {
    output = `1${output}`;
  }

  return output || '1';
}

function decodeBase58(value) {
  let result = 0n;
  for (const char of value) {
    const digit = BASE58_INDEX.get(char);
    if (digit == null) {
      throw new Error(`Invalid base58 character: ${char}`);
    }
    result = result * 58n + BigInt(digit);
  }

  const bytes = [];
  while (result > 0n) {
    bytes.unshift(Number(result & 0xffn));
    result >>= 8n;
  }

  let leadingZeroCount = 0;
  for (const char of value) {
    if (char !== '1') break;
    leadingZeroCount += 1;
  }

  return new Uint8Array([...new Array(leadingZeroCount).fill(0), ...bytes]);
}

function emitPushData(hexValue) {
  const hex = sanitizeHex(hexValue);
  const length = hex.length / 2;
  if (length < 0x100) {
    return `0c${length.toString(16).padStart(2, '0')}${hex}`;
  }
  if (length < 0x10000) {
    const sizeHex = `${(length & 0xff).toString(16).padStart(2, '0')}${((length >> 8) & 0xff).toString(16).padStart(2, '0')}`;
    return `0d${sizeHex}${hex}`;
  }
  throw new Error(`Data too large to push: ${length} bytes`);
}

function emitSmallInteger(value) {
  if (value < 0 || value > 16) {
    throw new Error(`Unsupported small integer: ${value}`);
  }
  return (0x10 + value).toString(16).padStart(2, '0');
}

export function reverseHex(hexValue) {
  const hex = sanitizeHex(hexValue);
  let output = '';
  for (let index = hex.length; index > 0; index -= 2) {
    output += hex.slice(index - 2, index);
  }
  return output;
}

export function hash160(hexValue) {
  return hash160Hex(hexValue);
}

export function deriveAccountIdHash(accountIdHexOrSeed) {
  const normalized = sanitizeHex(accountIdHexOrSeed || '');
  if (!normalized) {
    throw new Error('Account seed is required');
  }
  if (/^[0-9a-f]{40}$/i.test(normalized)) {
    return normalized;
  }
  return hash160Hex(normalized);
}

export function getAddressFromScriptHash(scriptHash, addressVersion = DEFAULT_NEO_ADDRESS_VERSION) {
  const payload = concatBytes(
    new Uint8Array([addressVersion]),
    hexToBytes(reverseHex(scriptHash))
  );
  const checksum = doubleSha256Bytes(payload).slice(0, 4);
  return encodeBase58(concatBytes(payload, checksum));
}

export function getScriptHashFromAddress(address) {
  const decoded = decodeBase58(String(address || '').trim());
  if (decoded.length !== 25) {
    throw new Error(`Invalid Neo address length: ${decoded.length}`);
  }
  const payload = decoded.slice(0, 21);
  const checksum = decoded.slice(21);
  const expectedChecksum = doubleSha256Bytes(payload).slice(0, 4);
  if (bytesToHex(checksum) !== bytesToHex(expectedChecksum)) {
    throw new Error('Invalid Neo address checksum');
  }
  return reverseHex(bytesToHex(payload.slice(1)));
}

export function createVerifyScript(contractHash, accountIdHex) {
  const accountId = deriveAccountIdHash(accountIdHex);
  const contract = sanitizeHex(contractHash);
  const operationHex = bytesToHex(new TextEncoder().encode('verify'));

  return [
    emitPushData(accountId),
    emitSmallInteger(1),
    'c0',
    emitSmallInteger(15),
    emitPushData(operationHex),
    emitPushData(reverseHex(contract)),
    '41627d5b52',
  ].join('');
}

export async function invokeReadFunction(rpcUrl, scriptHash, operation, args = []) {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'invokefunction',
      params: [scriptHash, operation, args],
    }),
  });

  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.error.message || 'RPC error');
  }
  return payload.result;
}
