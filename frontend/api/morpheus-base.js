function trim(value) {
  return String(value || '').trim();
}

export function normalizeNetwork(value) {
  return trim(value).toLowerCase() === 'testnet' ? 'testnet' : 'mainnet';
}

export function resolveNetwork(req) {
  return normalizeNetwork(
    req.query?.morpheus_network
      || req.body?.morpheus_network
      || req.headers?.['x-morpheus-network']
      || process.env.MORPHEUS_NETWORK
      || process.env.VITE_AA_NETWORK
      || process.env.VITE_MORPHEUS_NETWORK
  );
}

function normalizeUrl(value) {
  return trim(value).replace(/\/$/, '');
}

function isNetworkScopedHost(hostname) {
  const host = trim(hostname).toLowerCase();
  return host === 'morpheus-mainnet.meshmini.app' || host === 'morpheus-testnet.meshmini.app';
}

function isGatewayHost(hostname) {
  const host = trim(hostname).toLowerCase();
  return host === 'edge.meshmini.app'
    || host === 'control.meshmini.app'
    || host.endsWith('.workers.dev');
}

function normalizeBaseCandidate(baseUrl, network) {
  const normalized = normalizeUrl(baseUrl);
  if (!normalized) return '';
  if (/\/(mainnet|testnet)$/.test(normalized)) return normalized;

  try {
    const parsed = new URL(normalized);
    if (isNetworkScopedHost(parsed.hostname)) return normalized;
    if (isGatewayHost(parsed.hostname)) return `${normalized}/${network}`;
    return normalized;
  } catch {
    return normalized;
  }
}

export function resolveMorpheusRuntimeBase(req) {
  const network = resolveNetwork(req);
  const upper = network === 'testnet' ? 'TESTNET' : 'MAINNET';
  const candidates = [
    process.env[`MORPHEUS_${upper}_RUNTIME_URL`],
    process.env.MORPHEUS_RUNTIME_URL,
    process.env[`MORPHEUS_${upper}_API_BASE_URL`],
    process.env.MORPHEUS_API_BASE_URL,
    process.env[`MORPHEUS_${upper}_EDGE_BASE_URL`],
    process.env.MORPHEUS_EDGE_BASE_URL,
    network === 'testnet'
      ? 'https://morpheus-testnet.meshmini.app'
      : 'https://morpheus-mainnet.meshmini.app',
    `https://edge.meshmini.app/${network}`,
  ];

  for (const candidate of candidates) {
    const resolved = normalizeBaseCandidate(candidate, network);
    if (resolved) return resolved;
  }
  return '';
}

export function resolveMorpheusPaymasterEndpoint(networkInput) {
  const network = normalizeNetwork(networkInput);
  const upper = network === 'testnet' ? 'TESTNET' : 'MAINNET';
  const explicit = normalizeUrl(
    process.env[`MORPHEUS_PAYMASTER_${upper}_ENDPOINT`]
      || process.env.MORPHEUS_PAYMASTER_ENDPOINT
      || process.env.AA_PAYMASTER_ENDPOINT
      || ''
  );
  if (explicit) return explicit;
  const base = resolveMorpheusRuntimeBase({ query: { morpheus_network: network } });
  return base ? `${base}/paymaster/authorize` : '';
}

export function resolveMorpheusRuntimeToken() {
  return trim(
    process.env.MORPHEUS_RUNTIME_TOKEN
      || process.env.PHALA_API_TOKEN
      || process.env.PHALA_SHARED_SECRET
      || ''
  );
}
