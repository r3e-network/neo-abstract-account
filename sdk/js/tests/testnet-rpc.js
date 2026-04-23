const DEFAULT_TESTNET_RPC_URLS = Object.freeze([
  'http://seed1.neo.org:20332',
  'http://seed2.neo.org:20332',
  'http://seed3.neo.org:20332',
  'http://seed4.neo.org:20332',
  'http://seed5.neo.org:20332',
  'https://testnet1.neo.coz.io:443',
]);

function splitRpcList(value) {
  return String(value || '')
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function resolveTestnetRpcCandidates(env = process.env) {
  const candidates = [];
  const seen = new Set();

  const push = (value) => {
    const normalized = String(value || '').trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push(normalized);
  };

  for (const entry of splitRpcList(env.TESTNET_RPC_URLS)) push(entry);
  for (const entry of splitRpcList(env.TESTNET_RPC_URL)) push(entry);
  for (const entry of splitRpcList(env.NEO_RPC_URL)) push(entry);
  for (const entry of DEFAULT_TESTNET_RPC_URLS) push(entry);

  return candidates;
}

async function probeTestnetRpcUrl(rpcUrl, { fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch is required to probe testnet RPC endpoints');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'getversion',
        params: [],
        id: 1,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (payload?.error) {
      throw new Error(payload.error.message || 'RPC getversion failed');
    }

    return payload?.result || null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveTestnetRpcUrl({ env = process.env, fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {}) {
  const candidates = resolveTestnetRpcCandidates(env);
  let lastError = null;

  for (const rpcUrl of candidates) {
    try {
      await probeTestnetRpcUrl(rpcUrl, { fetchImpl, timeoutMs });
      return rpcUrl;
    } catch (error) {
      lastError = error;
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError || 'unknown error');
  throw new Error(`No reachable Neo N3 testnet RPC endpoint found across ${candidates.length} candidate(s): ${detail}`);
}

module.exports = {
  DEFAULT_TESTNET_RPC_URLS,
  probeTestnetRpcUrl,
  resolveTestnetRpcCandidates,
  resolveTestnetRpcUrl,
  splitRpcList,
};
