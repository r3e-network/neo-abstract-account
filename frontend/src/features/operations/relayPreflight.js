import { EC } from '../../config/errorCodes.js';
import { buildRelayBroadcastRequest } from './execution.js';

export function buildRelayPreflightRequest({ relayEndpoint = '', relayPayloadMode = 'best', relayRawEnabled = true, morpheusNetwork, transactionBody = {}, signatures = [] } = {}) {
  return {
    ...buildRelayBroadcastRequest({ relayEndpoint, relayPayloadMode, relayRawEnabled, transactionBody, signatures, morpheusNetwork }),
    simulate: true,
  };
}

export function normalizeRelayPreflightResult(payload = {}, payloadMode = 'best', t) {
  const fallbackT = typeof t === 'function' ? t : (_key, fb) => fb;
  const stack = Array.isArray(payload?.stack) ? payload.stack : [];
  const validationPreview = payload?.validationPreview && typeof payload.validationPreview === 'object'
    ? payload.validationPreview
    : null;
  const optionalPreview = validationPreview ? { validationPreview } : {};

  if (payload?.supported === false || payload?.code === 'simulation_not_supported_for_raw') {
    return {
      ok: false,
      level: 'warning',
      label: fallbackT('relayPreflight.unsupportedLabel', 'Simulation Unsupported'),
      detail: payload?.message || fallbackT('relayPreflight.unsupportedDetail', 'Simulation is not available for this relay payload.'),
      vmState: '',
      gasConsumed: '',
      operation: '',
      payloadMode,
      exception: '',
      supported: false,
      stack,
      ...optionalPreview,
    };
  }

  if (payload?.ok) {
    return {
      ok: true,
      level: 'ready',
      label: fallbackT('relayPreflight.passedLabel', 'Relay Check Passed'),
      detail: `${payload?.operation || fallbackT('relayPreflight.defaultOperation', 'Relay invocation')} ${fallbackT('relayPreflight.simulatedSuffix', 'simulated successfully')} (gas ${payload?.gasConsumed || payload?.gasconsumed || fallbackT('relayPreflight.unknown', 'unknown')}).`,
      vmState: String(payload?.vmState || payload?.vmstate || 'HALT').toUpperCase(),
      gasConsumed: String(payload?.gasConsumed || payload?.gasconsumed || ''),
      operation: String(payload?.operation || ''),
      payloadMode,
      exception: '',
      supported: true,
      stack,
      ...optionalPreview,
    };
  }

  return {
    ok: false,
    level: 'blocked',
    label: fallbackT('relayPreflight.failedLabel', 'Relay Check Failed'),
    detail: payload?.exception || payload?.message || fallbackT('relayPreflight.failedDetail', 'Relay simulation failed.'),
    vmState: String(payload?.vmState || payload?.vmstate || ''),
    gasConsumed: String(payload?.gasConsumed || payload?.gasconsumed || ''),
    operation: String(payload?.operation || ''),
    payloadMode,
    exception: String(payload?.exception || payload?.message || ''),
    supported: payload?.supported !== false,
    stack,
    ...optionalPreview,
  };
}

export async function runRelayPreflight({ walletService, relayEndpoint = '', relayPayloadMode = 'best', relayRawEnabled = true, morpheusNetwork, transactionBody = {}, signatures = [], t } = {}) {
  if (!walletService) {
    throw new Error(EC.walletServiceMissing);
  }

  const request = buildRelayPreflightRequest({ relayEndpoint, relayPayloadMode, relayRawEnabled, morpheusNetwork, transactionBody, signatures });
  const response = await walletService.relayTransaction(request);
  return normalizeRelayPreflightResult(response, relayPayloadMode, t);
}
