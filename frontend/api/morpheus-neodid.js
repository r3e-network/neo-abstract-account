import { resolveMorpheusRuntimeBase } from './morpheus-base.js';
import { checkRateLimit } from './rateLimiter.js';

function trim(value) {
  return String(value || '').trim();
}

function resolvePath(action) {
  const normalized = trim(action).toLowerCase();
  if (normalized === 'providers') return { path: '/neodid/providers', method: 'GET' };
  if (normalized === 'runtime') return { path: '/neodid/runtime', method: 'GET' };
  if (normalized === 'resolve') return { path: '/neodid/resolve', method: 'GET' };
  if (normalized === 'bind') return { path: '/neodid/bind', method: 'POST' };
  if (normalized === 'action-ticket') return { path: '/neodid/action-ticket', method: 'POST' };
  if (normalized === 'recovery-ticket') return { path: '/neodid/recovery-ticket', method: 'POST' };
  if (normalized === 'zklogin-ticket') return { path: '/neodid/zklogin-ticket', method: 'POST' };
  return null;
}

export default async function handler(req, res) {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const rateLimit = await checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter || 60));
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  const action = req.method === 'GET' ? req.query?.action : req.body?.action;
  const route = resolvePath(action);
  if (!route) {
    return res.status(400).json({ error: 'Unsupported Morpheus NeoDID action' });
  }

  const baseUrl = resolveMorpheusRuntimeBase(req);
  const query = route.method === 'GET'
    ? new URLSearchParams(
        Object.entries(req.query || {}).filter(([key, value]) => key !== 'action' && key !== 'morpheus_network' && value != null && value !== '')
      ).toString()
    : '';
  const url = `${baseUrl.replace(/\/$/, '')}${route.path}${query ? `?${query}` : ''}`;
  const options = {
    method: route.method,
    headers: { accept: 'application/json' },
  };
  if (route.method === 'POST') {
    const body = { ...(req.body || {}) };
    delete body.action;
    delete body.morpheus_network;
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
