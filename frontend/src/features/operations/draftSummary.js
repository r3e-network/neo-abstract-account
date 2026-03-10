import { buildTransactionExplorerUrl, normalizeTransactionId } from './explorer.js';

const PRESET_LABELS = {
  invoke: 'Generic Invoke',
  nep17Transfer: 'NEP-17 Transfer',
  multisigDraft: 'Multisig Draft',
  transfer: 'NEP-17 Transfer',
  multisig: 'Multisig Draft',
};

function resolveOperationLabel(draft = {}) {
  const preset = draft?.metadata?.preset;
  if (preset && PRESET_LABELS[preset]) return PRESET_LABELS[preset];

  const kind = draft?.operation_body?.kind || draft?.transaction_body?.kind || '';
  if (kind && PRESET_LABELS[kind]) return PRESET_LABELS[kind];

  const method = draft?.operation_body?.method || draft?.transaction_body?.clientInvocation?.operation || '';
  return method || 'Not staged';
}

function resolveLatestActivity(draft = {}) {
  const items = Array.isArray(draft?.metadata?.activity) ? draft.metadata.activity : [];
  if (items.length === 0) return 'No activity yet';
  const next = items.slice().sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))[0];
  return next?.detail || next?.type || 'No activity yet';
}

function looksCopyable(value) {
  return Boolean(String(value || '').trim());
}

export function buildDraftSummaryItems({ draft = {} } = {}) {
  const signerRequirements = Array.isArray(draft?.signer_requirements) ? draft.signer_requirements : [];
  const signatures = Array.isArray(draft?.signatures) ? draft.signatures : [];

  return [
    {
      label: 'Account',
      value: draft?.account?.accountAddressScriptHash || 'Not available',
    },
    {
      label: 'Operation',
      value: resolveOperationLabel(draft),
    },
    {
      label: 'Signers',
      value: `${signatures.length}/${signerRequirements.length} collected`,
    },
    {
      label: 'Relay Mode',
      value: draft?.broadcast_mode || 'client',
    },
    {
      label: 'Latest Activity',
      value: resolveLatestActivity(draft),
    },
  ];
}

export function buildDraftSummaryActions({ draft = {}, shareUrl = '', collaboratorUrl = '', operatorUrl = '', explorerBaseUrl = '' } = {}) {
  const actions = {};
  const accountValue = draft?.account?.accountAddressScriptHash || '';
  const latestActivity = resolveLatestActivity(draft);

  if (looksCopyable(accountValue) && accountValue !== 'Not available') {
    actions.Account = {
      label: 'Copy Account',
      value: accountValue,
    };
  }

  if (looksCopyable(shareUrl)) {
    actions['Share URL'] = {
      label: 'Copy Share URL',
      value: shareUrl,
    };
  }

  if (looksCopyable(collaboratorUrl)) {
    actions['Collaborator URL'] = {
      label: 'Copy Collaborator URL',
      value: collaboratorUrl,
    };
  }

  if (looksCopyable(operatorUrl)) {
    actions['Operator URL'] = {
      label: 'Copy Operator URL',
      value: operatorUrl,
    };
  }

  const latestActivityTxid = normalizeTransactionId(latestActivity);
  if (latestActivityTxid && explorerBaseUrl) {
    actions['Latest Activity'] = {
      id: 'open-url',
      label: 'View Explorer',
      url: buildTransactionExplorerUrl(explorerBaseUrl, latestActivityTxid),
    };
  } else if (looksCopyable(latestActivity) && latestActivity !== 'No activity yet') {
    actions['Latest Activity'] = {
      label: 'Copy Latest Value',
      value: latestActivity,
    };
  }

  return actions;
}
