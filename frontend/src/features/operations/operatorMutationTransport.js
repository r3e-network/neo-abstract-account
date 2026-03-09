import {
  canonicalizeOperatorMutationPayload,
  importOperatorPrivateKey,
  signOperatorMutationPayload,
} from '../../api/operatorMutationHelpers.js';

const STORAGE_PREFIX = 'aa_operator_session_v1';
const DEFAULT_OPERATOR_MUTATION_ENDPOINT = '/api/draft-operator';

function getStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function sessionStorageKey(shareSlug) {
  return `${STORAGE_PREFIX}:${shareSlug}`;
}

function readSession(shareSlug, storage) {
  const backend = getStorage(storage);
  if (!backend) return null;
  const raw = backend.getItem(sessionStorageKey(shareSlug));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeSession(shareSlug, value, storage) {
  const backend = getStorage(storage);
  if (!backend) return;
  backend.setItem(sessionStorageKey(shareSlug), JSON.stringify(value));
}

async function ensureKeyMaterial(shareSlug, storage) {
  const existing = readSession(shareSlug, storage);
  if (existing?.privateJwk && existing?.publicJwk) {
    return existing;
  }

  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const session = {
    privateJwk: await crypto.subtle.exportKey('jwk', keyPair.privateKey),
    publicJwk: await crypto.subtle.exportKey('jwk', keyPair.publicKey),
    operatorCounter: 0,
    accessSlug: '',
  };
  writeSession(shareSlug, session, storage);
  return session;
}

async function postJson(url, body, fetchImpl) {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || 'Operator mutation request failed.');
  }
  return payload;
}

export function createOperatorMutationTransport({
  endpoint = DEFAULT_OPERATOR_MUTATION_ENDPOINT,
  storage = null,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    return null;
  }

  return {
    async run({ shareSlug = '', accessSlug = '', mutation = '', payload = {} } = {}) {
      if (!shareSlug || !accessSlug || !mutation) {
        throw new Error('Signed operator mutations require a share slug, operator access slug, and mutation type.');
      }

      const session = await ensureKeyMaterial(shareSlug, storage);
      const claim = await postJson(endpoint, {
        action: 'claim',
        shareSlug,
        accessSlug,
        publicKeyJwk: session.publicJwk,
      }, fetchImpl);

      const nextSession = {
        ...session,
        operatorCounter: Number(claim?.operatorCounter || 0),
        accessSlug: claim?.accessSlug || accessSlug,
      };
      writeSession(shareSlug, nextSession, storage);

      const privateKey = await importOperatorPrivateKey(nextSession.privateJwk);
      const canonicalPayload = canonicalizeOperatorMutationPayload({
        shareSlug,
        mutation,
        payload,
        counter: nextSession.operatorCounter,
      });
      const signature = await signOperatorMutationPayload(canonicalPayload, privateKey);
      const result = await postJson(endpoint, {
        action: 'mutate',
        shareSlug,
        accessSlug: nextSession.accessSlug || accessSlug,
        mutation,
        payload,
        counter: nextSession.operatorCounter,
        signature,
      }, fetchImpl);

      writeSession(shareSlug, {
        ...nextSession,
        operatorCounter: Number(result?.operatorCounter || nextSession.operatorCounter + 1),
        accessSlug: result?.accessSlug || result?.draft?.operator_slug || nextSession.accessSlug || accessSlug,
      }, storage);

      return result?.draft || null;
    },
  };
}
