import { MORPHEUS_PUBLIC_REGISTRY } from '../src/config/generatedMorpheusRegistry.js';
import { MORPHEUS_PUBLIC_RUNTIME_CATALOG } from '../src/config/generatedMorpheusRuntimeCatalog.js';

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
  return host === 'oracle.meshmini.app';
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

function getRegistryRuntimeDefaults(network) {
  return MORPHEUS_PUBLIC_REGISTRY[normalizeNetwork(network)].morpheus;
}

function resolveWorkflowRoute(workflowId) {
  const workflow = MORPHEUS_PUBLIC_RUNTIME_CATALOG.workflows.find((item) => item.id === trim(workflowId));
  return trim(workflow?.route || '');
}

export function resolveMorpheusWorkflowIds() {
  return MORPHEUS_PUBLIC_RUNTIME_CATALOG.workflows.map((item) => item.id);
}

export function resolveMorpheusRuntimeBase(req) {
  const network = resolveNetwork(req);
  const upper = network === 'testnet' ? 'TESTNET' : 'MAINNET';
  const registryDefaults = getRegistryRuntimeDefaults(network);
  const candidates = [
    process.env[`MORPHEUS_${upper}_RUNTIME_URL`],
    process.env.MORPHEUS_RUNTIME_URL,
    process.env[`MORPHEUS_${upper}_API_BASE_URL`],
    process.env.MORPHEUS_API_BASE_URL,
    process.env[`MORPHEUS_${upper}_EDGE_BASE_URL`],
    process.env.MORPHEUS_EDGE_BASE_URL,
    registryDefaults.publicApiUrl,
    registryDefaults.edgeUrl,
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
  const paymasterRoute = resolveWorkflowRoute('paymaster.authorize') || '/paymaster/authorize';
  return base ? `${base}${paymasterRoute}` : '';
}

export function resolveMorpheusRuntimeToken(networkInput) {
  const network = normalizeNetwork(networkInput);
  const upper = network === 'testnet' ? 'TESTNET' : 'MAINNET';
  return trim(
    process.env[`MORPHEUS_${upper}_RUNTIME_TOKEN`]
      || process.env[`MORPHEUS_${upper}_PHALA_API_TOKEN`]
      || process.env.MORPHEUS_RUNTIME_TOKEN
      || process.env.PHALA_API_TOKEN
      || process.env.PHALA_SHARED_SECRET
      || ''
  );
}
