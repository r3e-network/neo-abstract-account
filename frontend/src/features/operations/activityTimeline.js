import { buildTransactionExplorerUrl, normalizeTransactionId } from './explorer.js';

export const ACTIVITY_FILTERS = [
  { id: 'all', label: 'All Events' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'signatures', label: 'Signatures' },
  { id: 'relay', label: 'Relay' },
  { id: 'broadcast', label: 'Broadcast' },
];

const TYPE_TO_GROUP = {
  account_loaded: 'workflow',
  operation_staged: 'workflow',
  draft_created: 'workflow',
  collaborator_link_rotated: 'workflow',
  operator_link_rotated: 'workflow',
  signature_added: 'signatures',
  relay_preflight: 'relay',
  broadcast_client: 'broadcast',
  broadcast_relay: 'broadcast',
};

const TYPE_TO_PRESENTATION = {
  account_loaded: { icon: '◎', tone: 'workflow', label: 'Account Loaded' },
  operation_staged: { icon: '◇', tone: 'workflow', label: 'Operation Staged' },
  draft_created: { icon: '✳', tone: 'workflow', label: 'Draft Created' },
  collaborator_link_rotated: { icon: '↻', tone: 'workflow', label: 'Collaborator Link Rotated' },
  operator_link_rotated: { icon: '⟲', tone: 'workflow', label: 'Operator Link Rotated' },
  signature_added: { icon: '✍', tone: 'signature', label: 'Signature Added' },
  relay_preflight: { icon: '⇄', tone: 'relay', label: 'Relay Check' },
  broadcast_client: { icon: '↑', tone: 'broadcast', label: 'Client Broadcast' },
  broadcast_relay: { icon: '↗', tone: 'broadcast', label: 'Relay Broadcast' },
};

const FILTER_EMPTY_STATES = {
  all: 'No activity recorded yet.',
  workflow: 'Load Abstract Account and Stage an operation to populate workflow activity.',
  signatures: 'Use Append Manual Signature or Sign with EVM Wallet to populate the signatures timeline.',
  relay: 'Run Check Relay to create relay diagnostics and readiness activity.',
  broadcast: 'Use Broadcast with Neo Wallet or Submit via Relay to create broadcast events.',
};

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function dateKey(date, useUtc = false) {
  const value = toDate(date);
  const year = useUtc ? value.getUTCFullYear() : value.getFullYear();
  const month = String((useUtc ? value.getUTCMonth() : value.getMonth()) + 1).padStart(2, '0');
  const day = String(useUtc ? value.getUTCDate() : value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
export function formatActivityDateLabel(dateValue, { now = new Date(), useUtc = false } = {}) {
  const currentKey = dateKey(now, useUtc);
  const yesterdayBase = toDate(now);
  if (useUtc) {
    yesterdayBase.setUTCDate(yesterdayBase.getUTCDate() - 1);
  } else {
    yesterdayBase.setDate(yesterdayBase.getDate() - 1);
  }
  const yesterdayKey = dateKey(yesterdayBase, useUtc);
  const targetKey = /^\d{4}-\d{2}-\d{2}$/.test(String(dateValue || '')) ? String(dateValue) : dateKey(dateValue, useUtc);

  if (targetKey === currentKey) return 'Today';
  if (targetKey === yesterdayKey) return 'Yesterday';
  return targetKey;
}

export function formatActivityTimeLabel(dateValue, { useUtc = false } = {}) {
  const value = toDate(dateValue);
  const hours = String(useUtc ? value.getUTCHours() : value.getHours()).padStart(2, '0');
  const minutes = String(useUtc ? value.getUTCMinutes() : value.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function classifyActivityEvent(event = {}) {
  return TYPE_TO_GROUP[event.type] || 'workflow';
}

export function buildActivityPresentation(event = {}) {
  return TYPE_TO_PRESENTATION[event.type] || { icon: '•', tone: 'workflow', label: event.type || 'Event' };
}

export function buildActivityActions(event = {}, context = {}) {
  const actions = [];

  if (event.type === 'draft_created' && context.shareUrl) {
    actions.push({ id: 'copy-share', label: 'Copy Share Link', value: context.shareUrl });
  }

  if (event.type === 'relay_preflight' && context.relayTargetId) {
    actions.push({ id: 'jump-relay', label: 'Jump to Relay', targetId: context.relayTargetId });
  }

  if (event.type === 'broadcast_client' || event.type === 'broadcast_relay') {
    const txid = normalizeTransactionId(event.detail);
    if (txid) {
      actions.push({ id: 'copy-txid', label: 'Copy TxID', value: txid });
      const explorerUrl = buildTransactionExplorerUrl(context.explorerBaseUrl, txid);
      if (explorerUrl) {
        actions.push({ id: 'open-url', label: 'Open Explorer', url: explorerUrl });
      }
    }
  }

  return actions;
}

export function buildActivityEmptyState(filterId = 'all') {
  return FILTER_EMPTY_STATES[filterId] || FILTER_EMPTY_STATES.all;
}

export function buildActivityFilterCounts(entries = []) {
  const counts = {
    all: 0,
    workflow: 0,
    signatures: 0,
    relay: 0,
    broadcast: 0,
  };

  for (const item of Array.isArray(entries) ? entries : []) {
    const group = classifyActivityEvent(item);
    counts.all += 1;
    if (Object.prototype.hasOwnProperty.call(counts, group)) {
      counts[group] += 1;
    }
  }

  return counts;
}

export function filterActivityEntries(entries = [], filterId = 'all') {
  const items = Array.isArray(entries) ? entries : [];
  if (!filterId || filterId === 'all') return items;
  return items.filter((item) => classifyActivityEvent(item) === filterId);
}

export function buildActivityGroups(entries = []) {
  const groups = new Map();
  for (const item of Array.isArray(entries) ? entries : []) {
    const date = String(item?.createdAt || '').slice(0, 10) || 'unknown';
    const bucket = groups.get(date) || [];
    bucket.push(item);
    groups.set(date, bucket);
  }

  return Array.from(groups.entries())
    .sort((left, right) => right[0].localeCompare(left[0]))
    .map(([date, items]) => ({
      date,
      items: items.slice().sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt))),
    }));
}
