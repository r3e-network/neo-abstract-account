const EVENT_TO_TONE = {
  draft_created: 'draft',
  relay_preflight: 'relay',
  broadcast_client: 'client',
  broadcast_relay: 'relay',
};

const EVENT_TO_LABEL = {
  draft_created: 'Draft Created',
  relay_preflight: 'Relay Checked',
  broadcast_client: 'Client Broadcast',
  broadcast_relay: 'Relay Submitted',
};

function latestActivity(activity = []) {
  const items = Array.isArray(activity) ? activity : [];
  if (items.length === 0) return null;
  return items.slice().sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))[0] || null;
}

export function buildDraftStatusBanner({ status = 'draft', activity = [] } = {}) {
  const latest = latestActivity(activity);
  if (!latest) {
    return {
      tone: status === 'relayed' ? 'relay' : status === 'broadcasted' ? 'client' : 'draft',
      title: 'Latest Draft State',
      label: status === 'relayed' ? 'Relay Submitted' : status === 'broadcasted' ? 'Client Broadcast' : 'Draft Ready',
      detail: 'No activity recorded yet.',
      timestamp: '',
    };
  }

  return {
    tone: EVENT_TO_TONE[latest.type] || 'draft',
    title: 'Latest Draft State',
    label: EVENT_TO_LABEL[latest.type] || latest.type || 'Draft Update',
    detail: latest.detail || 'No details available.',
    timestamp: latest.createdAt || '',
  };
}
