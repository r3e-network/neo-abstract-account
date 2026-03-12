import { createRemoteJWKSet, jwtVerify } from 'jose';

const DEFAULT_MORPHEUS_SERVICE_DID = 'did:morpheus:neo_n3:service:neodid';

function trim(value) {
  return String(value || '').trim();
}

function dedupe(items = []) {
  return Array.from(new Set(items.filter(Boolean)));
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

function buildVerifiedProfile(claims = {}) {
  const identityRoot = buildStableDidKey(claims);
  return {
    provider: 'web3auth',
    providerUid: identityRoot,
    identityRoot,
    did: identityRoot,
    serviceDid: trim(process.env.MORPHEUS_NEODID_SERVICE_DID || process.env.VITE_MORPHEUS_NEODID_SERVICE_DID || DEFAULT_MORPHEUS_SERVICE_DID),
    email: trim(claims.email || ''),
    phone: trim(claims.phone_number || claims.phone || ''),
    name: trim(claims.name || ''),
    aggregateVerifier: trim(claims.aggregateVerifier || ''),
    aggregateVerifierId: trim(claims.aggregateVerifierId || ''),
    verifier: trim(claims.verifier || ''),
    verifierId: trim(claims.verifierId || ''),
    linkedAccounts: dedupe([
      trim(claims.verifier || ''),
      ...dedupe(Array.isArray(claims.connectedAccounts) ? claims.connectedAccounts.map((item) => trim(item)) : []),
    ]),
    notificationChannels: {
      email: Boolean(trim(claims.email || '')),
      sms: Boolean(trim(claims.phone_number || claims.phone || '')),
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const idToken = trim(req.body?.idToken);
  if (!idToken) {
    return res.status(400).json({ error: 'idToken is required' });
  }

  const jwksUrl = trim(process.env.WEB3AUTH_JWKS_URL || 'https://api-auth.web3auth.io/.well-known/jwks.json');
  const clientId = trim(process.env.VITE_WEB3AUTH_CLIENT_ID || process.env.WEB3AUTH_CLIENT_ID || '');
  if (!clientId) {
    return res.status(500).json({ error: 'WEB3AUTH_CLIENT_ID is not configured' });
  }

  try {
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));
    const { payload } = await jwtVerify(idToken, JWKS, {
      audience: clientId,
    });
    const claims = Object.fromEntries(Object.entries(payload || {}).map(([key, value]) => [key, value]));
    const profile = buildVerifiedProfile(claims);
    if (!profile.did) {
      return res.status(422).json({ error: 'Unable to derive a stable Web3Auth DID' });
    }
    return res.status(200).json({
      ok: true,
      provider: 'web3auth',
      profile,
      claims,
    });
  } catch (error) {
    return res.status(401).json({
      error: error instanceof Error ? error.message : 'Web3Auth token verification failed',
    });
  }
}
