import { buildTransactionExplorerUrl, normalizeTransactionId } from './explorer.js';

function resolvePresetLabel(preset, t) {
  const map = {
    invoke: () => t('draftSummary.presetInvoke', 'Generic Invoke'),
    nep17Transfer: () => t('draftSummary.presetNep17', 'NEP-17 Transfer'),
    multisigDraft: () => t('draftSummary.presetMultisig', 'Multisig Draft'),
    transfer: () => t('draftSummary.presetNep17', 'NEP-17 Transfer'),
    multisig: () => t('draftSummary.presetMultisig', 'Multisig Draft'),
  };
  return map[preset] ? map[preset]() : null;
}

function resolveOperationLabel(draft = {}, t) {
  const preset = draft?.metadata?.preset;
  if (preset) {
    const label = resolvePresetLabel(preset, t);
    if (label) return label;
  }

  const kind = draft?.operation_body?.kind || draft?.transaction_body?.kind || '';
  if (kind) {
    const label = resolvePresetLabel(kind, t);
    if (label) return label;
  }

  const method = draft?.operation_body?.method || draft?.transaction_body?.clientInvocation?.operation || '';
  return method || t('draftSummary.notStaged', 'Not staged');
}

function resolveLatestActivity(draft = {}, t) {
  const items = Array.isArray(draft?.metadata?.activity) ? draft.metadata.activity : [];
  const noActivity = t('draftSummary.noActivity', 'No activity yet');
  if (items.length === 0) return noActivity;
  const next = items.slice().sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))[0];
  return next?.detail || next?.type || noActivity;
}

function looksCopyable(value) {
  return Boolean(String(value || '').trim());
}

export function buildDraftSummaryItems({ draft = {}, t } = {}) {
  const fallbackT = typeof t === 'function' ? t : (_key, fb) => fb;
  const signerRequirements = Array.isArray(draft?.signer_requirements) ? draft.signer_requirements : [];
  const signatures = Array.isArray(draft?.signatures) ? draft.signatures : [];
  const accountReference = draft?.account?.accountIdHash || draft?.account?.accountAddressScriptHash || fallbackT('draftSummary.notAvailable', 'Not available');

  return [
    {
      label: fallbackT('draftSummary.account', 'Account'),
      value: accountReference,
    },
    {
      label: fallbackT('draftSummary.operation', 'Operation'),
      value: resolveOperationLabel(draft, fallbackT),
    },
    {
      label: fallbackT('draftSummary.signers', 'Signers'),
      value: `${signatures.length}/${signerRequirements.length} ${fallbackT('draftSummary.collected', 'collected')}`,
    },
    {
      label: fallbackT('draftSummary.relayMode', 'Relay Mode'),
      value: draft?.broadcast_mode || 'client',
    },
    {
      label: fallbackT('draftSummary.latestActivity', 'Latest Activity'),
      value: resolveLatestActivity(draft, fallbackT),
    },
  ];
}

export function buildDraftSummaryActions({ draft = {}, shareUrl = '', collaboratorUrl = '', operatorUrl = '', explorerBaseUrl = '', t } = {}) {
  const fallbackT = typeof t === 'function' ? t : (_key, fb) => fb;
  const actions = {};
  const notAvailable = fallbackT('draftSummary.notAvailable', 'Not available');
  const accountValue = draft?.account?.accountIdHash || draft?.account?.accountAddressScriptHash || '';
  const latestActivity = resolveLatestActivity(draft, fallbackT);
  const noActivity = fallbackT('draftSummary.noActivity', 'No activity yet');

  if (looksCopyable(accountValue) && accountValue !== notAvailable) {
    actions.Account = {
      label: fallbackT('draftSummary.copyAccount', 'Copy Account'),
      value: accountValue,
    };
  }

  if (looksCopyable(shareUrl)) {
    actions['Share URL'] = {
      label: fallbackT('draftSummary.copyShareUrl', 'Copy Share URL'),
      value: shareUrl,
    };
  }

  if (looksCopyable(collaboratorUrl)) {
    actions['Collaborator URL'] = {
      label: fallbackT('draftSummary.copyCollaboratorUrl', 'Copy Collaborator URL'),
      value: collaboratorUrl,
    };
  }

  if (looksCopyable(operatorUrl)) {
    actions['Operator URL'] = {
      label: fallbackT('draftSummary.copyOperatorUrl', 'Copy Operator URL'),
      value: operatorUrl,
    };
  }

  const latestActivityTxid = normalizeTransactionId(latestActivity);
  if (latestActivityTxid && explorerBaseUrl) {
    actions['Latest Activity'] = {
      id: 'open-url',
      label: fallbackT('draftSummary.viewExplorer', 'View Explorer'),
      url: buildTransactionExplorerUrl(explorerBaseUrl, latestActivityTxid),
    };
  } else if (looksCopyable(latestActivity) && latestActivity !== noActivity) {
    actions['Latest Activity'] = {
      label: fallbackT('draftSummary.copyLatestValue', 'Copy Latest Value'),
      value: latestActivity,
    };
  }

  return actions;
}
