import { buildRelayBroadcastRequest } from './execution.js';

export function buildRelayPreflightRequest({ relayEndpoint = '', relayPayloadMode = 'best', relayRawEnabled = true, transactionBody = {}, signatures = [] } = {}) {
  return {
    ...buildRelayBroadcastRequest({ relayEndpoint, relayPayloadMode, relayRawEnabled, transactionBody, signatures }),
    simulate: true,
  };
}

export function normalizeRelayPreflightResult(payload = {}, payloadMode = 'best') {
  const stack = Array.isArray(payload?.stack) ? payload.stack : [];

  if (payload?.supported === false || payload?.code === 'simulation_not_supported_for_raw') {
    return {
      ok: false,
      level: 'warning',
      label: 'Simulation Unsupported',
      detail: payload?.message || 'Simulation is not available for this relay payload.',
      vmState: '',
      gasConsumed: '',
      operation: '',
      payloadMode,
      exception: '',
      supported: false,
      stack,
    };
  }

  if (payload?.ok) {
    return {
      ok: true,
      level: 'ready',
      label: 'Relay Check Passed',
      detail: `${payload?.operation || 'Relay invocation'} simulated successfully (gas ${payload?.gasConsumed || payload?.gasconsumed || 'unknown'}).`,
      vmState: String(payload?.vmState || payload?.vmstate || 'HALT').toUpperCase(),
      gasConsumed: String(payload?.gasConsumed || payload?.gasconsumed || ''),
      operation: String(payload?.operation || ''),
      payloadMode,
      exception: '',
      supported: true,
      stack,
    };
  }

  return {
    ok: false,
    level: 'blocked',
    label: 'Relay Check Failed',
    detail: payload?.exception || payload?.message || 'Relay simulation failed.',
    vmState: String(payload?.vmState || payload?.vmstate || ''),
    gasConsumed: String(payload?.gasConsumed || payload?.gasconsumed || ''),
    operation: String(payload?.operation || ''),
    payloadMode,
    exception: String(payload?.exception || payload?.message || ''),
    supported: payload?.supported !== false,
    stack,
  };
}

export async function runRelayPreflight({ walletService, relayEndpoint = '', relayPayloadMode = 'best', relayRawEnabled = true, transactionBody = {}, signatures = [] } = {}) {
  if (!walletService) {
    throw new Error('Wallet service is required for relay preflight.');
  }

  const request = buildRelayPreflightRequest({ relayEndpoint, relayPayloadMode, relayRawEnabled, transactionBody, signatures });
  const response = await walletService.relayTransaction(request);
  return normalizeRelayPreflightResult(response, relayPayloadMode);
}
