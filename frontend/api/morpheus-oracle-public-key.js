function trim(value) {
  return String(value || '').trim();
}

function normalizeNetwork(value) {
  return trim(value).toLowerCase() === 'testnet' ? 'testnet' : 'mainnet';
}

function resolveBaseUrl(req) {
  const network = normalizeNetwork(
    req.query?.morpheus_network
      || req.headers?.['x-morpheus-network']
      || process.env.MORPHEUS_NETWORK
      || process.env.VITE_AA_NETWORK
      || process.env.VITE_MORPHEUS_NETWORK
  );
  const explicit = trim(process.env.MORPHEUS_API_BASE_URL);
  const baseUrl = (explicit || 'https://morpheus.meshmini.app').replace(/\/$/, '');
  if (/\/(mainnet|testnet)$/.test(baseUrl)) return baseUrl;
  return `${baseUrl}/${network}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const baseUrl = resolveBaseUrl(req);
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/oracle/public-key`, {
    method: 'GET',
    headers: { accept: 'application/json' },
  });
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  return res.status(response.status).json(body);
}
