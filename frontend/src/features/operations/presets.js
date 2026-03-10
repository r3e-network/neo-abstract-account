import { sanitizeHex } from '../../utils/hex.js';
import { getScriptHashFromAddress } from '../../utils/neo.js';

export const OPERATION_PRESETS = [
  {
    id: 'invoke',
    label: 'Generic Invoke',
    description: 'Compose any AA wrapper contract call manually.',
  },
  {
    id: 'nep17Transfer',
    label: 'NEP-17 Transfer',
    description: 'Build a token transfer payload with account and recipient hashes.',
  },
  {
    id: 'batchCreate',
    label: 'Batch Account Creation',
    description: 'Create multiple accounts with shared governance in one transaction.',
  },
  {
    id: 'multisigDraft',
    label: 'Multisig Draft',
    description: 'Prepare a shareable transaction draft for additional co-signers.',
  },
];

function parseJson(text, fallback) {
  const value = String(text || '').trim();
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeHash160(value) {
  const hex = sanitizeHex(value || '');
  if (/^[0-9a-f]{40}$/i.test(hex)) {
    return hex;
  }

  const address = String(value || '').trim();
  if (!address) return '';

  try {
    return sanitizeHex(getScriptHashFromAddress(address));
  } catch {
    return hex;
  }
}

function toHash160Arg(value) {
  return { type: 'Hash160', value: value ? `0x${value}` : '0x' };
}

function toIntegerArg(value) {
  const normalized = String(value ?? '').trim();
  return { type: 'Integer', value: normalized || '0' };
}

function toAnyArg(value) {
  return {
    type: 'Any',
    value: value,
  };
}

function toArrayArg(items, itemType = 'String') {
  return {
    type: 'Array',
    value: (items || []).map(item => ({ type: itemType, value: item })),
  };
}

export function buildOperationFromPreset({
  preset = 'invoke',
  account = {},
  invoke = {},
  transfer = {},
  multisig = {},
  batch = {},
} = {}) {
  const normalizedTargetContract = sanitizeHex(invoke.targetContract || '');
  const normalizedMethod = String(invoke.method || '').trim();
  const normalizedArgs = parseJson(invoke.argsText || '[]', []);

  if (preset === 'nep17Transfer') {
    const fromHash = normalizeHash160(transfer.from || account.accountAddressScriptHash || '');
    const recipientHash = normalizeHash160(transfer.recipient || '');
    return {
      kind: 'transfer',
      targetContract: sanitizeHex(transfer.tokenScriptHash || ''),
      method: 'transfer',
      args: [
        toHash160Arg(fromHash),
        toHash160Arg(recipientHash),
        toIntegerArg(transfer.amount),
        toAnyArg(parseJson(transfer.data, String(transfer.data || '').trim() ? String(transfer.data).trim() : null)),
      ],
      metadata: {
        assetStandard: 'NEP-17',
      },
    };
  }

  if (preset === 'batchCreate') {
    const accountIds = parseJson(batch.accountIds || '[]', []);
    const admins = (parseJson(batch.admins || '[]', []) || []).map(normalizeHash160).filter(Boolean);
    const managers = (parseJson(batch.managers || '[]', []) || []).map(normalizeHash160).filter(Boolean);

    return {
      kind: 'batchCreate',
      targetContract: '',
      method: 'createAccountBatch',
      args: [
        toArrayArg(accountIds, 'String'),
        toArrayArg(admins.map(h => \`0x\${h}\`), 'Hash160'),
        toIntegerArg(batch.adminThreshold || 1),
        toArrayArg(managers.map(h => \`0x\${h}\`), 'Hash160'),
        toIntegerArg(batch.managerThreshold || 0),
      ],
      metadata: {
        accountCount: accountIds.length,
      },
    };
  }

  if (preset === 'multisigDraft') {
    return {
      kind: 'multisig',
      targetContract: normalizedTargetContract,
      method: normalizedMethod,
      args: normalizedArgs,
      metadata: {
        title: String(multisig.title || '').trim(),
        description: String(multisig.description || '').trim(),
        requiresAdditionalSigners: true,
      },
    };
  }

  return {
    kind: 'invoke',
    targetContract: normalizedTargetContract,
    method: normalizedMethod,
    args: normalizedArgs,
    metadata: {},
  };
}

export function buildPresetSummary(operation = {}) {
  if (!operation || !operation.kind) {
    return {
      title: 'No operation staged',
      detail: 'Choose a preset and stage an operation to generate a transaction body.',
    };
  }

  if (operation.kind === 'transfer') {
    return {
      title: 'NEP-17 Transfer',
      detail: \`Amount \${operation.args?.[2]?.value || '0'} via \${operation.targetContract || 'token contract pending'}\`,
    };
  }

  if (operation.kind === 'batchCreate') {
    const count = operation.metadata?.accountCount || 0;
    return {
      title: 'Batch Account Creation',
      detail: \`Creating \${count} account\${count !== 1 ? 's' : ''} with shared governance\`,
    };
  }

  if (operation.kind === 'multisig') {
    return {
      title: operation.metadata?.title || 'Multisig Draft',
      detail: operation.metadata?.description || \`\${operation.method || 'method pending'} requires additional co-signers\`,
    };
  }

  return {
    title: 'Generic Invoke',
    detail: \`\${operation.method || 'method pending'} on \${operation.targetContract || 'target contract pending'}\`,
  };
}
