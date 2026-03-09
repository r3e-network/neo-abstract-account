export function normalizeTransactionId(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  const normalized = text.startsWith('0x') ? text : `0x${text}`;
  return /^0x[0-9a-f]{64}$/i.test(normalized) ? normalized : '';
}

export function buildTransactionExplorerUrl(baseUrl = '', txid = '') {
  const normalizedBase = String(baseUrl || '').trim().replace(/\/+$/, '');
  const normalizedTxid = normalizeTransactionId(txid);
  if (!normalizedBase || !normalizedTxid) return '';
  return `${normalizedBase}/${normalizedTxid}`;
}

export function extractLatestTransactionId(entries = []) {
  const items = Array.isArray(entries) ? entries : [];
  const latest = items
    .filter((item) => item?.type === 'broadcast_client' || item?.type === 'broadcast_relay')
    .slice()
    .sort((left, right) => String(right?.createdAt || '').localeCompare(String(left?.createdAt || '')))
    .find((item) => normalizeTransactionId(item?.detail));

  return latest ? normalizeTransactionId(latest.detail) : '';
}
