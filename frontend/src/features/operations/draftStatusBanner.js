const EVENT_TO_TONE = {
  draft_created: 'draft',
  did_bound: 'identity',
  did_notice_sent: 'identity',
  recovery_requested: 'identity',
  recovery_finalized: 'identity',
  recovery_cancelled: 'identity',
  proxy_session_requested: 'identity',
  proxy_session_revoked: 'identity',
  relay_preflight: 'relay',
  broadcast_client: 'client',
  broadcast_relay: 'relay',
};

const EVENT_TO_LABEL_KEY = {
  draft_created: 'operations.eventDraftCreated',
  did_bound: 'operations.eventDidBound',
  did_notice_sent: 'operations.eventRecoveryNoticeSent',
  recovery_requested: 'operations.eventRecoveryRequested',
  recovery_finalized: 'operations.eventRecoveryFinalized',
  recovery_cancelled: 'operations.eventRecoveryCancelled',
  proxy_session_requested: 'operations.eventPrivateSessionRequested',
  proxy_session_revoked: 'operations.eventPrivateSessionRevoked',
  relay_preflight: 'operations.eventRelayChecked',
  broadcast_client: 'operations.eventClientBroadcast',
  broadcast_relay: 'operations.eventRelaySubmitted',
};

const EVENT_TO_LABEL_FALLBACK = {
  draft_created: 'Draft Created',
  did_bound: 'DID Bound',
  did_notice_sent: 'Recovery Notice Sent',
  recovery_requested: 'Recovery Requested',
  recovery_finalized: 'Recovery Finalized',
  recovery_cancelled: 'Recovery Cancelled',
  proxy_session_requested: 'Private Session Requested',
  proxy_session_revoked: 'Private Session Revoked',
  relay_preflight: 'Relay Checked',
  broadcast_client: 'Client Broadcast',
  broadcast_relay: 'Relay Submitted',
};

function latestActivity(activity = []) {
  const items = Array.isArray(activity) ? activity : [];
  if (items.length === 0) return null;
  return items.slice().sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))[0] || null;
}

export function buildDraftStatusBanner({ status = 'draft', activity = [], t } = {}) {
  const translate = (key, fallback) => (t ? t(key, fallback) : fallback);
  const latest = latestActivity(activity);
  if (!latest) {
    return {
      tone: status === 'relayed' ? 'relay' : status === 'broadcasted' ? 'client' : 'draft',
      title: translate('operations.latestDraftState', 'Latest Draft State'),
      label: status === 'relayed'
        ? translate('operations.eventRelaySubmitted', 'Relay Submitted')
        : status === 'broadcasted'
          ? translate('operations.eventClientBroadcast', 'Client Broadcast')
          : translate('operations.draftReady', 'Draft Ready'),
      detail: translate('operations.noActivityRecorded', 'No activity recorded yet.'),
      timestamp: '',
    };
  }

  const labelKey = EVENT_TO_LABEL_KEY[latest.type];
  const labelFallback = EVENT_TO_LABEL_FALLBACK[latest.type] || latest.type || translate('operations.draftUpdateFallback', 'Draft Update');

  return {
    tone: EVENT_TO_TONE[latest.type] || 'draft',
    title: translate('operations.latestDraftState', 'Latest Draft State'),
    label: labelKey ? translate(labelKey, labelFallback) : labelFallback,
    detail: latest.detail || translate('operations.noDetailsAvailable', 'No details available.'),
    timestamp: latest.createdAt || '',
  };
}
