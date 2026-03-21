import { buildTransactionExplorerUrl, normalizeTransactionId } from './explorer.js';

const RPC_FAULT_PATTERNS = [
  { pattern: /fault:\s*(.+)/i, group: 1 },
  { pattern: /VM fault:\s*(.+)/i, group: 1 },
  { pattern: /exception[:\s]+(.+)/i, group: 1 },
];

const HTTP_ERROR_PATTERN = /(?:Failed to fetch|TypeError|FetchError|NetworkError|Network request failed)/i;
const ERROR_PREFIX_PATTERN = /^(?:Error|TypeError|RuntimeError|NetworkError)[:\s]+(.+)/i;

const JSONRPC_ERROR_PATTERN = /"message"\s*:\s*"([^"]+)"/;

const HTTP_ERROR_SENTINEL = '__http_error__';

export function humanizeSubmissionError(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  for (const { pattern, group } of RPC_FAULT_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match && match[group]) {
      return match[group].trim();
    }
  }

  const httpMatch = trimmed.match(HTTP_ERROR_PATTERN);
  if (httpMatch) {
    return HTTP_ERROR_SENTINEL;
  }

  const prefixMatch = trimmed.match(ERROR_PREFIX_PATTERN);
  if (prefixMatch && prefixMatch[1]) {
    return prefixMatch[1].trim();
  }

  const jsonMatch = trimmed.match(JSONRPC_ERROR_PATTERN);
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1].trim();
  }

  if (trimmed.length > 200) {
    return `${trimmed.slice(0, 197)}...`;
  }

  return trimmed;
}

function buildActionConfig(t) {
  return {
    'relay-check': {
      idle: t ? t('operations.submissionRelayCheck', 'Check Relay') : 'Check Relay',
      pending: t ? t('operations.submissionRelayChecking', 'Checking Relay…') : 'Checking Relay…',
      pendingTitle: t ? t('operations.submissionRelayCheckRunning', 'Relay Check Running') : 'Relay Check Running',
      pendingDetail: t ? t('operations.submissionRelayCheckDetail', 'Waiting for the relay simulation result.') : 'Waiting for the relay simulation result.',
      successTitle: t ? t('operations.submissionRelayCheckSuccess', 'Relay Check Complete') : 'Relay Check Complete',
      errorTitle: t ? t('operations.submissionRelayCheckError', 'Relay Check Failed') : 'Relay Check Failed',
    },
    'client-broadcast': {
      idle: t ? t('operations.submissionClientBroadcast', 'Broadcast with Neo Wallet') : 'Broadcast with Neo Wallet',
      pending: t ? t('operations.submissionClientBroadcasting', 'Broadcasting…') : 'Broadcasting…',
      pendingTitle: t ? t('operations.submissionClientBroadcastRunning', 'Client Broadcast Running') : 'Client Broadcast Running',
      pendingDetail: t ? t('operations.submissionClientBroadcastDetail', 'Waiting for the Neo wallet submission result.') : 'Waiting for the Neo wallet submission result.',
      successTitle: t ? t('operations.submissionClientBroadcastSuccess', 'Client Broadcast Sent') : 'Client Broadcast Sent',
      errorTitle: t ? t('operations.submissionClientBroadcastError', 'Client Broadcast Failed') : 'Client Broadcast Failed',
    },
    'relay-submit': {
      idle: t ? t('operations.submissionRelaySubmit', 'Submit via Relay') : 'Submit via Relay',
      pending: t ? t('operations.submissionRelaySubmitting', 'Submitting…') : 'Submitting…',
      pendingTitle: t ? t('operations.submissionRelaySubmitRunning', 'Relay Submission Running') : 'Relay Submission Running',
      pendingDetail: t ? t('operations.submissionRelaySubmitDetail', 'Waiting for the relay submission result.') : 'Waiting for the relay submission result.',
      successTitle: t ? t('operations.submissionRelaySubmitSuccess', 'Relay Submission Sent') : 'Relay Submission Sent',
      errorTitle: t ? t('operations.submissionRelaySubmitError', 'Relay Submission Failed') : 'Relay Submission Failed',
    },
  };
}

export function getSubmissionButtonLabel(action = '', pendingAction = '', t) {
  const config = buildActionConfig(t)[action];
  if (!config) return '';
  return pendingAction === action ? config.pending : config.idle;
}

export function buildSubmissionReceipt({
  action = '',
  phase = 'idle',
  detail = '',
  txid = '',
  explorerBaseUrl = '',
  t,
} = {}) {
  const config = buildActionConfig(t)[action];
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
    const rawDetail = detail || '';
    const humanDetail = humanizeSubmissionError(rawDetail);
    const isHttpError = humanDetail === HTTP_ERROR_SENTINEL;
    const displayDetail = isHttpError
      ? (t ? t('operations.submissionNetworkError', 'Network request failed. Check your connection and relay endpoint.') : 'Network request failed. Check your connection and relay endpoint.')
      : humanDetail || (t ? t('operations.submissionGenericError', 'The request did not complete successfully.') : 'The request did not complete successfully.');
    const receipt = {
      tone: 'error',
      title: config.errorTitle,
      detail: displayDetail,
      txid: '',
      explorerUrl: '',
    };
    if (humanDetail && !isHttpError && humanDetail !== rawDetail) {
      receipt.rawDetail = rawDetail;
    }
    return receipt;
  }

  return {
    tone: 'success',
    title: config.successTitle,
    detail: detail || '',
    txid: normalizedTxid,
    explorerUrl,
  };
}

export function resolveLatestSubmissionReceipt(entries = [], { explorerBaseUrl = '', t } = {}) {
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
    t,
  });
}
