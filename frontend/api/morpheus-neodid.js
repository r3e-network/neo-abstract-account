function trim(value) {
  return String(value || '').trim();
}

function resolvePath(action) {
  const normalized = trim(action).toLowerCase();
  if (normalized === 'providers') return { path: '/api/neodid/providers', method: 'GET' };
  if (normalized === 'runtime') return { path: '/api/neodid/runtime', method: 'GET' };
  if (normalized === 'bind') return { path: '/api/neodid/bind', method: 'POST' };
  if (normalized === 'action-ticket') return { path: '/api/neodid/action-ticket', method: 'POST' };
  if (normalized === 'recovery-ticket') return { path: '/api/neodid/recovery-ticket', method: 'POST' };
  return null;
}

export default async function handler(req, res) {
  const action = req.method === 'GET' ? req.query?.action : req.body?.action;
  const route = resolvePath(action);
  if (!route) {
    return res.status(400).json({ error: 'Unsupported Morpheus NeoDID action' });
  }

  const baseUrl = trim(process.env.MORPHEUS_API_BASE_URL || 'https://www.morpheus-matrix.dev');
  const url = `${baseUrl.replace(/\/$/, '')}${route.path}`;
  const options = {
    method: route.method,
    headers: { accept: 'application/json' },
  };
  if (route.method === 'POST') {
    const body = { ...(req.body || {}) };
    delete body.action;
    options.headers['content-type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  return res.status(response.status).json(body);
}
