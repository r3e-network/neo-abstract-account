import { sanitizeHex } from '../../utils/hex.js';
import { cloneImmutable } from './helpers.js';

export function normalizeSignatureEntry(input = {}) {
  return {
    signerId: String(input.signerId || '').trim(),
    kind: String(input.kind || '').trim() || 'neo',
    signatureHex: sanitizeHex(input.signatureHex || ''),
    publicKey: sanitizeHex(input.publicKey || ''),
    txHash: sanitizeHex(input.txHash || ''),
    payloadDigest: sanitizeHex(input.payloadDigest || ''),
    metadata: cloneImmutable(input.metadata || null),
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

export function appendSignatureEntries(entries = [], signature) {
  const next = normalizeSignatureEntry(signature);
  const existing = Array.isArray(entries) ? entries.map((item) => cloneImmutable(item)) : [];
  const duplicate = existing.some((item) => item.signerId === next.signerId && item.kind === next.kind);
  return duplicate ? existing : [...existing, next];
}

export function summarizeSignerProgress(requirements = [], signatures = []) {
  const signatureKeys = new Set(signatures.map((item) => `${item.kind}:${item.signerId}`));
  const satisfied = requirements.filter((item) => signatureKeys.has(`${item.kind}:${item.id}`));
  const pending = requirements.filter((item) => !signatureKeys.has(`${item.kind}:${item.id}`));
  return {
    requiredCount: requirements.length,
    signatureCount: signatures.length,
    satisfied,
    pending,
    isComplete: pending.length === 0 && requirements.length > 0,
  };
}

export function buildTransactionDraftExport({ account, operationBody, transactionBody, signerRequirements, signatures, share, broadcast } = {}) {
  return cloneImmutable({
    account,
    operationBody,
    transactionBody,
    signerRequirements,
    signatures,
    share,
    broadcast,
  });
}
