import { sanitizeHex } from '../../utils/hex.js';
import { reverseHex } from '../../utils/neo.js';

export function deriveAccountForms(input = {}) {
  const accountAddressScriptHash = sanitizeHex(input.accountAddressScriptHash || '');
  const accountSignerScriptHash = sanitizeHex(input.accountSignerScriptHash || '');
  const accountIdHash = sanitizeHex(input.accountIdHash || '');

  if (accountAddressScriptHash && !accountSignerScriptHash) {
    return {
      accountIdHash,
      accountAddressScriptHash,
      accountSignerScriptHash: sanitizeHex(reverseHex(accountAddressScriptHash)),
    };
  }

  if (accountSignerScriptHash && !accountAddressScriptHash) {
    return {
      accountIdHash,
      accountAddressScriptHash: sanitizeHex(reverseHex(accountSignerScriptHash)),
      accountSignerScriptHash,
    };
  }

  return {
    accountIdHash,
    accountAddressScriptHash,
    accountSignerScriptHash,
  };
}

export function cloneImmutable(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function createSharePath(draftId, basePath = '/tx') {
  return `${basePath}/${encodeURIComponent(draftId)}`;
}
