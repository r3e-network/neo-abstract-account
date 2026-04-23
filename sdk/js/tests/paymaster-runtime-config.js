const DEFAULT_TESTNET_PAYMASTER_BASE_URL = 'https://oracle.meshmini.app/testnet';

function trimTrailingSlash(value = '') {
  return String(value || '').trim().replace(/\/$/, '');
}

function resolvePaymasterAuthorizeEndpoint(env = process.env) {
  const explicitEndpoint = trimTrailingSlash(
    env.MORPHEUS_PAYMASTER_TESTNET_ENDPOINT || env.MORPHEUS_PAYMASTER_ENDPOINT || ''
  );
  if (explicitEndpoint) {
    return explicitEndpoint.endsWith('/paymaster/authorize')
      ? explicitEndpoint
      : `${explicitEndpoint}/paymaster/authorize`;
  }

  const runtimeBaseUrl = trimTrailingSlash(
    env.MORPHEUS_TESTNET_RUNTIME_URL
      || env.MORPHEUS_RUNTIME_URL
      || env.PHALA_API_URL
      || DEFAULT_TESTNET_PAYMASTER_BASE_URL
  );
  return runtimeBaseUrl ? `${runtimeBaseUrl}/paymaster/authorize` : '';
}

function shouldSkipPaymasterRelayValidation(env = process.env, capabilities = {}) {
  if (String(env.PAYMASTER_ACCOUNT_ID || '').trim()) return '';
  if (String(env.MORPHEUS_LOCAL_PAYMASTER_HANDLER_PATH || '').trim()) return '';
  if (capabilities.hasPhalaCli) return '';
  return 'skipped because paymaster relay needs PAYMASTER_ACCOUNT_ID or a local paymaster handler / phala CLI (global or npx) to update the allowlist for the derived account';
}

module.exports = {
  DEFAULT_TESTNET_PAYMASTER_BASE_URL,
  resolvePaymasterAuthorizeEndpoint,
  shouldSkipPaymasterRelayValidation,
  trimTrailingSlash,
};
