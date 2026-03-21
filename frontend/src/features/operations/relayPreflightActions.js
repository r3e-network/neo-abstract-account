function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function serializeRelayPreflightPayload(relayRequest = null) {
  return relayRequest ? JSON.stringify(relayRequest, null, 2) : '';
}

export function serializeRelayPreflightStack(stack = []) {
  return JSON.stringify(Array.isArray(stack) ? stack : [], null, 2);
}

export function buildRelayPreflightExport({ relayCheck = {}, relayRequest = null, t } = {}) {
  const fallbackT = typeof t === 'function' ? t : (_key, fb) => fb;
  return {
    exportedAt: new Date().toISOString(),
    summary: {
      ok: Boolean(relayCheck.ok),
      level: relayCheck.level || 'idle',
      label: relayCheck.label || fallbackT('operations.notChecked', 'Not Checked'),
      detail: relayCheck.detail || '',
      payloadMode: relayCheck.payloadMode || 'best',
      vmState: relayCheck.vmState || '',
      gasConsumed: relayCheck.gasConsumed || '',
      operation: relayCheck.operation || '',
      exception: relayCheck.exception || '',
      supported: relayCheck.supported !== false,
    },
    request: clone(relayRequest),
    stack: clone(relayCheck.stack || []),
  };
}
