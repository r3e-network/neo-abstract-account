import { createRemoteJWKSet, jwtVerify } from 'jose';
import { checkRateLimit } from './rateLimiter.js';

function trim(value) {
  return String(value || '').trim();
}

function buildStableDidKey(claims = {}) {
  const aggregateVerifier = trim(claims.aggregateVerifier || '');
  const aggregateVerifierId = trim(claims.aggregateVerifierId || '');
  if (aggregateVerifier && aggregateVerifierId) {
    return `web3auth:${aggregateVerifier}:${aggregateVerifierId}`;
  }

  const verifier = trim(claims.verifier || '');
  const verifierId = trim(claims.verifierId || claims.email || claims.sub || '');
  if (verifier && verifierId) {
    return `web3auth:${verifier}:${verifierId}`;
  }

  const fallback = trim(claims.sub || claims.email || claims.name || '');
  return fallback ? `web3auth:user:${fallback}` : '';
}

function resolveWebhookConfig(channel) {
  if (channel === 'email') {
    return {
      url: trim(process.env.DID_EMAIL_WEBHOOK_URL),
      token: trim(process.env.DID_EMAIL_WEBHOOK_TOKEN),
    };
  }
  if (channel === 'sms') {
    return {
      url: trim(process.env.DID_SMS_WEBHOOK_URL),
      token: trim(process.env.DID_SMS_WEBHOOK_TOKEN),
    };
  }
  return { url: '', token: '' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  const rateLimit = await checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter));
    return res.status(429).json({ error: 'rate_limit_exceeded', retryAfter: rateLimit.retryAfter });
  }

  const idToken = trim(req.body?.idToken);
  if (!idToken) {
    return res.status(400).json({ error: 'idToken is required' });
  }

  const jwksUrl = trim(process.env.WEB3AUTH_JWKS_URL || 'https://api-auth.web3auth.io/.well-known/jwks.json');
  const clientId = trim(process.env.WEB3AUTH_CLIENT_ID || process.env.VITE_WEB3AUTH_CLIENT_ID || '');
  if (!clientId) {
    return res.status(500).json({ error: 'WEB3AUTH_CLIENT_ID is not configured' });
  }

  let verifiedDid = '';
  try {
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));
    const { payload } = await jwtVerify(idToken, JWKS, {
      audience: clientId,
    });
    verifiedDid = buildStableDidKey(payload || {});
  } catch (error) {
    return res.status(401).json({
      error: error instanceof Error ? error.message : 'Web3Auth token verification failed',
    });
  }

  if (!verifiedDid) {
    return res.status(422).json({ error: 'Unable to derive a stable Web3Auth DID' });
  }

  const { channel, did, to, template, payload } = req.body || {};
  if (trim(did) && trim(did) !== verifiedDid) {
    return res.status(403).json({ error: 'DID does not match the verified Web3Auth identity' });
  }
  const normalizedChannel = trim(channel).toLowerCase();
  if (normalizedChannel !== 'email' && normalizedChannel !== 'sms') {
    return res.status(400).json({ error: 'Unsupported notification channel' });
  }

  if (!trim(to)) {
    return res.status(400).json({ error: 'Notification target is required' });
  }

  const config = resolveWebhookConfig(normalizedChannel);
  if (!config.url) {
    return res.status(501).json({ error: `${normalizedChannel.toUpperCase()} webhook is not configured` });
  }

  const headers = { 'content-type': 'application/json' };
  if (config.token) {
    headers.authorization = `Bearer ${config.token}`;
    headers['x-notification-token'] = config.token;
  }

  const response = await fetch(config.url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      channel: normalizedChannel,
      did: trim(did) || verifiedDid,
      to: trim(to),
      template: trim(template) || 'aa_recovery',
      payload: payload && typeof payload === 'object' ? payload : {},
    }),
  });

  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    return res.status(response.status).json({
      error: body?.error || body?.message || `${normalizedChannel.toUpperCase()} notification failed`,
    });
  }

  return res.status(200).json({
    ok: true,
    channel: normalizedChannel,
    response: body,
  });
}
