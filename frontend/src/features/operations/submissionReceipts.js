import { cloneImmutable } from './helpers.js';
import { DEFAULT_SUBMISSION_RECEIPT_HISTORY_LIMIT } from './constants.js';
import { normalizeTransactionId } from './explorer.js';
import { buildSubmissionReceipt } from './submissionFeedback.js';
import { formatActivityDateLabel, formatActivityTimeLabel } from './activityTimeline.js';

export const MAX_SUBMISSION_RECEIPTS = DEFAULT_SUBMISSION_RECEIPT_HISTORY_LIMIT;

export function createSubmissionReceiptEntry({
  action = '',
  phase = 'success',
  detail = '',
  txid = '',
  createdAt = new Date().toISOString(),
} = {}) {
  return {
    action: String(action || '').trim(),
    phase: String(phase || 'success').trim() || 'success',
    detail: String(detail || '').trim(),
    txid: normalizeTransactionId(txid),
    createdAt: String(createdAt || new Date().toISOString()),
  };
}

export function appendSubmissionReceiptEntries(entries = [], receipt, { maxItems = MAX_SUBMISSION_RECEIPTS } = {}) {
  const existing = Array.isArray(entries) ? entries.map((item) => cloneImmutable(item)) : [];
  const next = [...existing, createSubmissionReceiptEntry(receipt)];
  return next.slice(Math.max(0, next.length - maxItems));
}

export function resolveLatestSubmissionReceiptEntry(entries = []) {
  const items = Array.isArray(entries) ? entries : [];
  if (items.length === 0) return null;
  return items
    .slice()
    .sort((left, right) => String(right?.createdAt || '').localeCompare(String(left?.createdAt || '')))[0] || null;
}

export function buildSubmissionReceiptHistoryItems(
  entries = [],
  { explorerBaseUrl = '', limit = 4, now = new Date(), useUtc = false, t } = {},
) {
  return (Array.isArray(entries) ? entries : [])
    .slice()
    .sort((left, right) => String(right?.createdAt || '').localeCompare(String(left?.createdAt || '')))
    .slice(0, limit)
    .map((entry) => {
      const normalized = createSubmissionReceiptEntry(entry);
      return {
        ...normalized,
        createdLabel: `${formatActivityDateLabel(normalized.createdAt, { now, useUtc, t })} · ${formatActivityTimeLabel(normalized.createdAt, { useUtc, t })}`,
        ...buildSubmissionReceipt({
          action: normalized.action,
          phase: normalized.phase,
          detail: normalized.detail,
          txid: normalized.txid,
          explorerBaseUrl,
          t,
        }),
      };
    });
}
