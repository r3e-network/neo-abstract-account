import { resolveMorpheusRuntimeBase } from './morpheus-base.js';
import { checkRateLimit } from './rateLimiter.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const rateLimit = await checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter || 60));
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  const baseUrl = resolveMorpheusRuntimeBase(req);
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
