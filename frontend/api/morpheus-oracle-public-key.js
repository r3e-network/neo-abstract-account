import { resolveMorpheusRuntimeBase } from './morpheus-base.js';
import { checkRateLimit, resolveClientIp, resolveRateLimitFailure } from './rateLimiter.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = resolveClientIp(req);
  const rateLimit = await checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    const failure = resolveRateLimitFailure(rateLimit);
    if (failure.retryAfter) res.setHeader('Retry-After', String(failure.retryAfter));
    return res.status(failure.statusCode).json({
      error: failure.error === 'client_identity_unavailable' ? failure.error : 'Rate limit exceeded',
    });
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
