import { sanitizeHex } from '../utils/hex.js';

export const ZKLOGIN_DEFAULT_PROVIDER = 'web3auth';
export const ZKLOGIN_SUPPORTED_PROVIDERS = ['web3auth', 'google', 'twitter', 'github'];

function encodeUtf8(value = '') {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(String(value || ''));
  }
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(String(value || ''), 'utf8'));
  }
  return Uint8Array.from(Array.from(String(value || ''), (char) => char.charCodeAt(0)));
}

function bytesToHex(bytes) {
  return Array.from(bytes || [], (value) => value.toString(16).padStart(2, '0')).join('');
}

function encodeLengthPrefixedUtf8Hex(value = '') {
  const bytes = encodeUtf8(value);
  if (bytes.length === 0 || bytes.length > 255) {
    throw new Error('zklogin provider must be between 1 and 255 bytes');
  }
  return `${bytes.length.toString(16).padStart(2, '0')}${bytesToHex(bytes)}`;
}

function ensureSizedHex(value, expectedBytes, label) {
  const normalized = sanitizeHex(value || '');
  if (normalized.length !== expectedBytes * 2) {
    throw new Error(`${label} must be ${expectedBytes} bytes`);
  }
  return normalized;
}

function ensurePublicKeyHex(value) {
  const normalized = sanitizeHex(value || '');
  if (normalized.length !== 66 && normalized.length !== 130) {
    throw new Error('zklogin signer public key must be 33 or 65 bytes');
  }
  return normalized;
}

export function normalizeZkLoginProvider(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || ZKLOGIN_DEFAULT_PROVIDER;
}

export function buildZkLoginVerifierParamsHex({
  publicKey,
  provider = ZKLOGIN_DEFAULT_PROVIDER,
  masterNullifier,
} = {}) {
  const normalizedPublicKey = ensurePublicKeyHex(publicKey);
  const normalizedProvider = normalizeZkLoginProvider(provider);
  const providerHex = encodeLengthPrefixedUtf8Hex(normalizedProvider);
  const publicKeyLengthHex = (normalizedPublicKey.length / 2).toString(16).padStart(2, '0');
  const normalizedMasterNullifier = ensureSizedHex(masterNullifier, 32, 'zklogin master nullifier');
  return `01${publicKeyLengthHex}${normalizedPublicKey}${providerHex}${normalizedMasterNullifier}`;
}

export function buildZkLoginProofHex({
  provider = ZKLOGIN_DEFAULT_PROVIDER,
  masterNullifier,
  actionNullifier,
  signature,
} = {}) {
  const normalizedProvider = normalizeZkLoginProvider(provider);
  const providerHex = encodeLengthPrefixedUtf8Hex(normalizedProvider);
  const normalizedMasterNullifier = ensureSizedHex(masterNullifier, 32, 'zklogin master nullifier');
  const normalizedActionNullifier = ensureSizedHex(actionNullifier, 32, 'zklogin action nullifier');
  const normalizedSignature = ensureSizedHex(signature, 64, 'zklogin signature');
  return `01${providerHex}${normalizedMasterNullifier}${normalizedActionNullifier}${normalizedSignature}`;
}

export function formatZkLoginTicket(ticket = {}) {
  const provider = normalizeZkLoginProvider(ticket.provider);
  const publicKey = ensurePublicKeyHex(ticket.public_key || ticket.publicKey || '');
  const masterNullifier = ensureSizedHex(ticket.master_nullifier || ticket.masterNullifier || '', 32, 'zklogin master nullifier');
  const actionNullifier = ensureSizedHex(ticket.action_nullifier || ticket.actionNullifier || '', 32, 'zklogin action nullifier');
  const signature = ensureSizedHex(ticket.signature || '', 64, 'zklogin signature');

  return {
    provider,
    publicKey,
    masterNullifier,
    actionNullifier,
    signature,
    verifierParamsHex: buildZkLoginVerifierParamsHex({
      publicKey,
      provider,
      masterNullifier,
    }),
    proofHex: buildZkLoginProofHex({
      provider,
      masterNullifier,
      actionNullifier,
      signature,
    }),
  };
}
