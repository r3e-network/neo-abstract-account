import { connectedDidProfile, setConnectedDidProfile } from '@/utils/did';
import { RUNTIME_CONFIG } from '@/config/runtimeConfig';
import { EC } from '../config/errorCodes.js';

const DID_STORAGE_KEY = 'aa_connected_did_profile';

function trim(value) {
  return String(value || '').trim();
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null || value === '') return [];
  return [value];
}

function dedupe(items = []) {
  return Array.from(new Set(items.filter(Boolean)));
}

function buildStableDidKey(userInfo = {}, tokenClaims = {}) {
  const aggregateVerifier = trim(userInfo.aggregateVerifier || tokenClaims.aggregateVerifier || '');
  const aggregateVerifierId = trim(userInfo.aggregateVerifierId || tokenClaims.aggregateVerifierId || '');
  if (aggregateVerifier && aggregateVerifierId) {
    return `web3auth:${aggregateVerifier}:${aggregateVerifierId}`;
  }

  const verifier = trim(userInfo.verifier || tokenClaims.verifier || '');
  const verifierId = trim(userInfo.verifierId || tokenClaims.verifierId || userInfo.email || tokenClaims.email || tokenClaims.sub || '');
  if (verifier && verifierId) {
    return `web3auth:${verifier}:${verifierId}`;
  }

  const fallback = trim(
    tokenClaims.sub
    || userInfo.sub
    || userInfo.email
    || tokenClaims.email
    || userInfo.name
    || tokenClaims.name
    || ''
  );
  return fallback ? `web3auth:user:${fallback}` : '';
}

function decodeJwtClaims(token) {
  const raw = trim(token);
  if (!raw || raw.split('.').length < 2) return {};
  try {
    const payload = raw.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
    return JSON.parse(window.atob(padded));
  } catch (e) {
    if (import.meta.env.DEV) console.error('[didService] JWT decode failed:', e?.message);
    return {};
  }
}

function buildDidProfile(userInfo = {}, tokenClaims = {}, options = {}) {
  const identityRoot = buildStableDidKey(userInfo, tokenClaims);
  const linkedAccounts = dedupe([
    ...toArray(userInfo.typeOfLogin),
    ...toArray(userInfo.loginType),
    ...toArray(userInfo.connectedAccounts),
    ...toArray(userInfo.linkedAccounts),
    ...toArray(options.loginProvider),
  ]);

  return {
    provider: RUNTIME_CONFIG.neoDidProvider || 'web3auth',
    providerUid: identityRoot,
    identityRoot,
    did: identityRoot,
    serviceDid: RUNTIME_CONFIG.morpheusNeoDidServiceDid,
    email: trim(userInfo.email || tokenClaims.email || ''),
    phone: trim(userInfo.phone || tokenClaims.phone_number || ''),
    name: trim(userInfo.name || tokenClaims.name || ''),
    profileImage: trim(userInfo.profileImage || userInfo.profileImageUrl || ''),
    aggregateVerifier: trim(userInfo.aggregateVerifier || tokenClaims.aggregateVerifier || ''),
    aggregateVerifierId: trim(userInfo.aggregateVerifierId || tokenClaims.aggregateVerifierId || ''),
    verifier: trim(userInfo.verifier || tokenClaims.verifier || ''),
    verifierId: trim(userInfo.verifierId || tokenClaims.verifierId || ''),
    idToken: trim(options.idToken || ''),
    linkedAccounts,
    notificationChannels: {
      email: Boolean(trim(userInfo.email || tokenClaims.email || '')),
      sms: Boolean(trim(userInfo.phone || tokenClaims.phone_number || '')),
    },
    rawUserInfo: userInfo,
    tokenClaims,
  };
}

async function verifyDidProfile(idToken) {
  const endpoint = trim(RUNTIME_CONFIG.didVerificationEndpoint);
  if (!endpoint || !trim(idToken)) return null;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.error) {
    const err = new Error(EC.didRequestFailed);
    err.rpcDetail = payload?.error || payload?.message || null;
    throw err;
  }
  return payload;
}

class DidService {
  constructor() {
    this.web3auth = null;
    this.bootstrap();
  }

  get isConfigured() {
    return Boolean(trim(RUNTIME_CONFIG.web3AuthClientId));
  }

  get isConnected() {
    return Boolean(connectedDidProfile.value?.did);
  }

  get profile() {
    return connectedDidProfile.value;
  }

  bootstrap() {
    if (typeof window === 'undefined') return;
    try {
      const cached = window.localStorage.getItem(DID_STORAGE_KEY);
      if (!cached) return;
      setConnectedDidProfile(JSON.parse(cached));
    } catch (e) {
      if (import.meta.env.DEV) console.error('[didService] bootstrap localStorage parse failed:', e?.message);
      setConnectedDidProfile(null);
    }
  }

  persist(profile) {
    setConnectedDidProfile(profile);
    if (typeof window === 'undefined') return;
    if (!profile) {
      window.localStorage.removeItem(DID_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(DID_STORAGE_KEY, JSON.stringify(profile));
  }

  async ensureClient() {
    if (!this.isConfigured || typeof window === 'undefined') return null;
    if (this.web3auth) return this.web3auth;

    const modal = await import('@web3auth/modal');
    const chainNamespace = modal.CHAIN_NAMESPACES?.EIP155 || RUNTIME_CONFIG.web3AuthChainNamespace || 'eip155';
    const network = modal.WEB3AUTH_NETWORK?.[RUNTIME_CONFIG.web3AuthNetwork] || RUNTIME_CONFIG.web3AuthNetwork;
    const loginMethods = {};

    if (RUNTIME_CONFIG.web3AuthEmailLoginEnabled) {
      loginMethods.email_passwordless = { name: 'Email' };
    }
    if (RUNTIME_CONFIG.web3AuthSmsLoginEnabled) {
      loginMethods.sms_passwordless = { name: 'SMS' };
    }

    const options = {
      clientId: RUNTIME_CONFIG.web3AuthClientId,
      web3AuthNetwork: network,
      chainConfig: {
        chainNamespace,
        chainId: RUNTIME_CONFIG.web3AuthChainId,
        rpcTarget: RUNTIME_CONFIG.web3AuthRpcTarget,
      },
      modalConfig: {},
      uiConfig: {
        appName: RUNTIME_CONFIG.web3AuthProjectName || 'DID.Morpheus',
        mode: 'dark',
        loginMethods,
      },
    };

    if (trim(RUNTIME_CONFIG.web3AuthRedirectUrl)) {
      options.redirectUrl = RUNTIME_CONFIG.web3AuthRedirectUrl;
    }

    this.web3auth = new modal.Web3Auth(options);
    await this.web3auth.init();

    if (this.web3auth.connected) {
      await this.refreshProfile();
    }

    return this.web3auth;
  }

  async refreshProfile({ loginProvider } = {}) {
    const client = await this.ensureClient();
    if (!client) return null;

    let userInfo = null;
    let idToken = '';
    try {
      userInfo = await client.getUserInfo();
    } catch (e) {
      if (import.meta.env.DEV) console.error('[didService] getUserInfo failed:', e?.message);
      userInfo = null;
    }
    try {
      idToken = typeof client.authenticateUser === 'function' ? await client.authenticateUser() : '';
    } catch (e) {
      if (import.meta.env.DEV) console.error('[didService] authenticateUser failed:', e?.message);
      idToken = '';
    }
    const verified = idToken ? await verifyDidProfile(idToken).catch((e) => { if (import.meta.env.DEV) console.error('[didService] verifyDidProfile failed:', e?.message); return null; }) : null;
    const tokenClaims = verified?.claims || decodeJwtClaims(idToken);
    const profile = verified?.profile
      ? { ...verified.profile, rawUserInfo: userInfo || {}, tokenClaims, idToken: trim(idToken || '') }
      : buildDidProfile(userInfo || {}, tokenClaims, { idToken, loginProvider });
    this.persist(profile.did ? profile : null);
    return this.profile;
  }

  async connect({ loginProvider } = {}) {
    const client = await this.ensureClient();
    if (!client) {
      throw new Error(EC.web3AuthDidNotConfigured);
    }

    if (loginProvider && typeof client.connectTo === 'function') {
      const modal = await import('@web3auth/modal');
      const connector = modal.WALLET_CONNECTORS?.AUTH || 'auth';
      await client.connectTo(connector, { loginProvider });
    } else {
      await client.connect();
    }

    const profile = await this.refreshProfile({ loginProvider });
    if (!profile?.did) {
      throw new Error(EC.web3AuthNoDidDerived);
    }
    return profile;
  }

  async disconnect() {
    try {
      if (this.web3auth && typeof this.web3auth.logout === 'function') {
        await this.web3auth.logout();
      }
    } finally {
      this.persist(null);
    }
  }

  buildNeoDidSubject() {
    const profile = this.profile;
    if (!profile?.provider || !profile?.idToken) return null;
    return {
      provider: profile.provider,
      provider_uid: profile.providerUid || '',
      id_token: profile.idToken,
      metadata: {
        email: profile.email || undefined,
        phone: profile.phone || undefined,
        linked_accounts: profile.linkedAccounts,
        aggregate_verifier: profile.aggregateVerifier || undefined,
      },
    };
  }
}

export const didService = new DidService();
