import { RUNTIME_CONFIG } from './runtimeConfig.js';

export function getOperationsRuntime(config = RUNTIME_CONFIG) {
  const collaborationEnabled = Boolean(config.supabaseUrl && config.supabaseAnonKey);
  const relayEnabled = Boolean(config.relayEndpoint);

  return {
    collaborationEnabled,
    relayEnabled,
    relayEndpoint: config.relayEndpoint,
    relayRpcUrl: config.relayRpcUrl,
    relayMetaEnabled: Boolean(config.relayMetaEnabled),
    relayRawEnabled: Boolean(config.relayRawEnabled),
    explorerBaseUrl: config.explorerBaseUrl,
    matrixContractHash: config.matrixContractHash,
    supabaseUrl: config.supabaseUrl,
    supabaseAnonKey: config.supabaseAnonKey,
    broadcastModes: ['client', 'relay'],
  };
}

export const OPERATIONS_RUNTIME = getOperationsRuntime();
