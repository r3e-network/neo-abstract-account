import { sanitizeHex } from '../../utils/hex.js';
import { reverseHex } from '../../utils/neo.js';

export function deriveAccountForms(input = {}) {
  const accountIdHex = sanitizeHex(input.accountIdHex || '');
  const accountAddressScriptHash = sanitizeHex(input.accountAddressScriptHash || '');
  const accountSignerScriptHash = sanitizeHex(input.accountSignerScriptHash || '');

  if (accountAddressScriptHash && !accountSignerScriptHash) {
    return {
      accountIdHex,
      accountAddressScriptHash,
      accountSignerScriptHash: sanitizeHex(reverseHex(accountAddressScriptHash)),
    };
  }

  if (accountSignerScriptHash && !accountAddressScriptHash) {
    return {
      accountIdHex,
      accountAddressScriptHash: sanitizeHex(reverseHex(accountSignerScriptHash)),
      accountSignerScriptHash,
    };
  }

  return {
    accountIdHex,
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
