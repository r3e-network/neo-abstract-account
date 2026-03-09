import { buildTransactionExplorerUrl, normalizeTransactionId } from './explorer.js';

const ACTION_CONFIG = {
  'relay-check': {
    idle: 'Check Relay',
    pending: 'Checking Relay…',
    pendingTitle: 'Relay Check Running',
    pendingDetail: 'Waiting for the relay simulation result.',
    successTitle: 'Relay Check Complete',
    errorTitle: 'Relay Check Failed',
  },
  'client-broadcast': {
    idle: 'Broadcast with Neo Wallet',
    pending: 'Broadcasting…',
    pendingTitle: 'Client Broadcast Running',
    pendingDetail: 'Waiting for the Neo wallet submission result.',
    successTitle: 'Client Broadcast Sent',
    errorTitle: 'Client Broadcast Failed',
  },
  'relay-submit': {
    idle: 'Submit via Relay',
    pending: 'Submitting…',
    pendingTitle: 'Relay Submission Running',
    pendingDetail: 'Waiting for the relay submission result.',
    successTitle: 'Relay Submission Sent',
    errorTitle: 'Relay Submission Failed',
  },
};

export function getSubmissionButtonLabel(action = '', pendingAction = '') {
  const config = ACTION_CONFIG[action];
  if (!config) return '';
  return pendingAction === action ? config.pending : config.idle;
}

export function buildSubmissionReceipt({
  action = '',
  phase = 'idle',
  detail = '',
  txid = '',
  explorerBaseUrl = '',
} = {}) {
  const config = ACTION_CONFIG[action];
  if (!config || phase === 'idle') return null;

  const normalizedTxid = normalizeTransactionId(txid);
  const explorerUrl = buildTransactionExplorerUrl(explorerBaseUrl, normalizedTxid);

  if (phase === 'pending') {
    return {
      tone: 'pending',
      title: config.pendingTitle,
      detail: detail || config.pendingDetail,
      txid: '',
      explorerUrl: '',
    };
  }

  if (phase === 'error') {
    return {
      tone: 'error',
      title: config.errorTitle,
      detail: detail || 'The request did not complete successfully.',
      txid: '',
      explorerUrl: '',
    };
  }

  return {
    tone: 'success',
    title: config.successTitle,
    detail: detail || '',
    txid: normalizedTxid,
    explorerUrl,
  };
}


export function resolveLatestSubmissionReceipt(entries = [], { explorerBaseUrl = '' } = {}) {
  const latest = (Array.isArray(entries) ? entries : [])
    .slice()
    .sort((left, right) => String(right?.createdAt || '').localeCompare(String(left?.createdAt || '')))[0];
  if (!latest) return null;
  return buildSubmissionReceipt({
    action: latest.action,
    phase: latest.phase,
    detail: latest.detail,
    txid: latest.txid,
    explorerBaseUrl,
  });
}
