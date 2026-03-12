import { RUNTIME_CONFIG } from '@/config/runtimeConfig';
import { didService } from '@/services/didService';
import { notificationService } from '@/services/notificationService';
import { invokeReadFunction, getScriptHashFromAddress } from '@/utils/neo';
import { sanitizeHex } from '@/utils/hex';
import { encryptJsonWithMorpheusOracleKey } from '@/utils/morpheusEncryption';
import { walletService, getAbstractAccountHash } from '@/services/walletService';

function trim(value) {
  return String(value || '').trim();
}

function toHash160Param(value) {
  return {
    type: 'Hash160',
    value: `0x${sanitizeHex(value || '')}`,
  };
}

function toByteArrayParam(value) {
  return {
    type: 'ByteArray',
    value: `0x${sanitizeHex(value || '')}`,
  };
}

function toStringParam(value) {
  return {
    type: 'String',
    value: String(value ?? ''),
  };
}

function toIntegerParam(value) {
  return {
    type: 'Integer',
    value: String(value ?? '0'),
  };
}

function normalizeScriptHash(value) {
  const raw = trim(value);
  if (!raw) return '';
  if (/^[Nn]/.test(raw)) {
    return sanitizeHex(getScriptHashFromAddress(raw));
  }
  return sanitizeHex(raw);
}

function decodeBase64ToHex(value) {
  if (!value) return '';
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('hex').toLowerCase();
  }
  const binary = globalThis.atob ? globalThis.atob(value) : '';
  return Array.from(binary, (char) => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
}

function decodeStackItem(item) {
  if (!item || typeof item !== 'object') return null;
  switch (item.type) {
    case 'Integer':
      return String(item.value ?? '0');
    case 'Boolean':
      return Boolean(item.value);
    case 'Hash160':
      return trim(item.value || '');
    case 'ByteString': {
      const hex = decodeBase64ToHex(item.value || '');
      if (!hex) return '';
      if (hex.length === 40) return `0x${hex}`;
      try {
        if (typeof Buffer !== 'undefined') {
          return Buffer.from(item.value || '', 'base64').toString('utf8');
        }
      } catch {
        // ignore
      }
      return `0x${hex}`;
    }
    case 'Array':
    case 'Struct':
      return Array.isArray(item.value) ? item.value.map((entry) => decodeStackItem(entry)) : [];
    default:
      return item.value ?? null;
  }
}

export async function fetchAccountIdByAddress({ rpcUrl, aaContractHash, accountAddressScriptHash } = {}) {
  const result = await invokeReadFunction(rpcUrl, sanitizeHex(aaContractHash), 'getAccountIdByAddress', [
    { type: 'Hash160', value: `0x${sanitizeHex(accountAddressScriptHash)}` },
  ]);
  if (result?.state === 'FAULT') {
    throw new Error(result?.exception || 'getAccountIdByAddress fault');
  }
  const top = result?.stack?.[0];
  if (!top || top.type !== 'ByteString' || !top.value) {
    throw new Error('getAccountIdByAddress returned no account id');
  }
  return decodeBase64ToHex(top.value);
}

export async function fetchVerifierContractByAddress({ rpcUrl, aaContractHash, accountAddressScriptHash } = {}) {
  const result = await invokeReadFunction(rpcUrl, sanitizeHex(aaContractHash), 'getVerifierContractByAddress', [
    { type: 'Hash160', value: `0x${sanitizeHex(accountAddressScriptHash)}` },
  ]);
  if (result?.state === 'FAULT') {
    throw new Error(result?.exception || 'getVerifierContractByAddress fault');
  }
  const top = result?.stack?.[0];
  const value = String(top?.value || '').trim();
  if (!value) return '';
  return sanitizeHex(value);
}

async function readVerifierMethod({ rpcUrl, verifierHash, operation, args = [] } = {}) {
  const result = await invokeReadFunction(rpcUrl, sanitizeHex(verifierHash), operation, args);
  if (result?.state === 'FAULT') {
    throw new Error(result?.exception || `${operation} fault`);
  }
  return decodeStackItem(result?.stack?.[0]);
}

export async function fetchUnifiedVerifierState({ rpcUrl, verifierHash, accountIdHex } = {}) {
  const normalizedVerifier = sanitizeHex(verifierHash);
  const accountIdParam = toByteArrayParam(accountIdHex);
  const [
    owner,
    morpheusOracle,
    recoveryNonce,
    sessionNonce,
    threshold,
    timelock,
    pendingRecovery,
    activeSession,
  ] = await Promise.all([
    readVerifierMethod({ rpcUrl, verifierHash: normalizedVerifier, operation: 'getOwner', args: [accountIdParam] }),
    readVerifierMethod({ rpcUrl, verifierHash: normalizedVerifier, operation: 'getMorpheusOracle', args: [accountIdParam] }).catch(() => ''),
    readVerifierMethod({ rpcUrl, verifierHash: normalizedVerifier, operation: 'getRecoveryNonce', args: [accountIdParam] }).catch(() => '0'),
    readVerifierMethod({ rpcUrl, verifierHash: normalizedVerifier, operation: 'getSessionNonce', args: [accountIdParam] }).catch(() => '0'),
    readVerifierMethod({ rpcUrl, verifierHash: normalizedVerifier, operation: 'getThreshold', args: [accountIdParam] }).catch(() => '0'),
    readVerifierMethod({ rpcUrl, verifierHash: normalizedVerifier, operation: 'getTimelock', args: [accountIdParam] }).catch(() => '0'),
    readVerifierMethod({ rpcUrl, verifierHash: normalizedVerifier, operation: 'getPendingRecovery', args: [accountIdParam] }).catch(() => []),
    readVerifierMethod({ rpcUrl, verifierHash: normalizedVerifier, operation: 'getActiveSession', args: [accountIdParam] }).catch(() => []),
  ]);

  return {
    verifierHash: `0x${normalizedVerifier}`,
    owner,
    morpheusOracle,
    recoveryNonce,
    sessionNonce,
    threshold,
    timelock,
    pendingRecovery: Array.isArray(pendingRecovery) ? {
      newOwner: pendingRecovery[0] || '',
      recoveryNonce: pendingRecovery[1] || '0',
      approvedCount: pendingRecovery[2] || '0',
      initiatedAt: pendingRecovery[3] || '0',
      executableAt: pendingRecovery[4] || '0',
      active: Boolean(pendingRecovery[5]),
    } : null,
    activeSession: Array.isArray(activeSession) ? {
      executor: activeSession[0] || '',
      actionId: activeSession[1] || '',
      actionNullifier: activeSession[2] || '',
      expiresAt: activeSession[3] || '0',
      active: Boolean(activeSession[4]),
    } : null,
  };
}

async function fetchOraclePublicKey() {
  const response = await fetch(RUNTIME_CONFIG.morpheusOracleKeyEndpoint, {
    method: 'GET',
    headers: { accept: 'application/json' },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.public_key) {
    throw new Error(body?.error || 'Unable to load Morpheus oracle public key');
  }
  return body;
}

async function callNeoDid(action, payload = {}) {
  const normalizedAction = trim(action).toLowerCase();
  const method = normalizedAction === 'resolve' ? 'GET' : 'POST';
  const url = method === 'GET'
    ? `${RUNTIME_CONFIG.morpheusNeoDidEndpoint}?${new URLSearchParams(
        Object.entries({ action: normalizedAction, ...payload }).filter(([, value]) => value != null && value !== '')
      ).toString()}`
    : RUNTIME_CONFIG.morpheusNeoDidEndpoint;
  const response = await fetch(url, method === 'GET'
    ? { method, headers: { accept: 'application/json' } }
    : {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: normalizedAction, ...payload }),
      });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.error) {
    throw new Error(body?.error || body?.message || `NeoDID ${action} failed`);
  }
  return body;
}

async function buildEncryptedSubjectPatch(extra = {}) {
  const subject = didService.buildNeoDidSubject();
  if (!subject?.provider || !subject?.id_token) {
    throw new Error('A connected Web3Auth identity with id_token is required.');
  }
  const oracleKey = await fetchOraclePublicKey();
  const confidentialPatch = {
    id_token: subject.id_token,
    provider_uid: subject.provider_uid || undefined,
    ...extra,
  };
  const encrypted_params = await encryptJsonWithMorpheusOracleKey(
    oracleKey.public_key,
    JSON.stringify(confidentialPatch),
  );
  return {
    provider: subject.provider,
    encrypted_params,
    provider_uid: subject.provider_uid || undefined,
  };
}

class MorpheusDidService {
  async bindDid({ vaultAccount, claimType = 'Web3Auth_PrimaryIdentity', claimValue = 'verified', metadata = {} } = {}) {
    const subjectPatch = await buildEncryptedSubjectPatch({
      linked_accounts: didService.profile?.linkedAccounts || [],
      email: didService.profile?.email || undefined,
      phone: didService.profile?.phone || undefined,
    });
    if (!subjectPatch?.provider || !subjectPatch?.encrypted_params) {
      throw new Error('Connect DID first.');
    }
    return callNeoDid('bind', {
      vault_account: `0x${normalizeScriptHash(vaultAccount)}`,
      provider: subjectPatch.provider,
      claim_type: claimType,
      claim_value: claimValue,
      encrypted_params: subjectPatch.encrypted_params,
      metadata: {
        provider_uid_hint: subjectPatch.provider_uid || undefined,
        identity_root: didService.profile?.identityRoot || didService.profile?.providerUid || undefined,
        service_did: didService.profile?.serviceDid || RUNTIME_CONFIG.morpheusNeoDidServiceDid,
        ...metadata,
      },
    });
  }

  async resolveDid({ did = RUNTIME_CONFIG.morpheusNeoDidServiceDid, format = '' } = {}) {
    return callNeoDid('resolve', {
      did,
      format: trim(format),
    });
  }

  async previewRecoveryTicket({ aaContract, verifierContract, accountId, newOwner, recoveryNonce, expiresAt } = {}) {
    const subjectPatch = await buildEncryptedSubjectPatch({
      linked_accounts: didService.profile?.linkedAccounts || [],
      email: didService.profile?.email || undefined,
      phone: didService.profile?.phone || undefined,
    });
    return callNeoDid('recovery-ticket', {
      ...subjectPatch,
      network: 'neo_n3',
      aa_contract: `0x${sanitizeHex(aaContract || getAbstractAccountHash())}`,
      verifier_contract: `0x${sanitizeHex(verifierContract)}`,
      account_id: trim(accountId),
      new_owner: `0x${normalizeScriptHash(newOwner)}`,
      recovery_nonce: String(recoveryNonce ?? '0'),
      expires_at: String(expiresAt),
    });
  }

  async previewActionTicket({ executor, actionId } = {}) {
    const subjectPatch = await buildEncryptedSubjectPatch({
      linked_accounts: didService.profile?.linkedAccounts || [],
    });
    return callNeoDid('action-ticket', {
      ...subjectPatch,
      disposable_account: `0x${normalizeScriptHash(executor)}`,
      action_id: trim(actionId),
      callback_encoding: 'neo_n3_action_v3',
    });
  }

  async invokeRecoveryRequest({ verifierHash, accountIdHex, newOwner, expiresAt, provider = 'web3auth' } = {}) {
    const subjectPatch = await buildEncryptedSubjectPatch({
      linked_accounts: didService.profile?.linkedAccounts || [],
      email: didService.profile?.email || undefined,
      phone: didService.profile?.phone || undefined,
    });
    const params = [
      toByteArrayParam(accountIdHex),
      toStringParam(provider),
      toHash160Param(normalizeScriptHash(newOwner)),
      toStringParam(String(expiresAt)),
      toStringParam(subjectPatch.encrypted_params),
    ];
    const result = await walletService.invoke({
      scriptHash: sanitizeHex(verifierHash),
      operation: 'requestRecoveryTicket',
      args: params,
    });

    const profile = didService.profile;
    const notificationPayload = {
      aa_contract: getAbstractAccountHash(),
      verifier: sanitizeHex(verifierHash),
      account_id: accountIdHex,
      new_owner: normalizeScriptHash(newOwner),
      expires_at: expiresAt,
    };
    if (profile?.email && notificationService.canEmail) {
      await notificationService.sendRecoveryEmail({
        did: profile.did,
        email: profile.email,
        payload: notificationPayload,
      }).catch(() => {});
    }
    if (profile?.phone && notificationService.canSms) {
      await notificationService.sendRecoverySms({
        did: profile.did,
        phone: profile.phone,
        payload: notificationPayload,
      }).catch(() => {});
    }
    return result;
  }

  async invokeProxySessionRequest({ verifierHash, accountIdHex, executor, expiresAt, provider = 'web3auth' } = {}) {
    const subjectPatch = await buildEncryptedSubjectPatch({
      linked_accounts: didService.profile?.linkedAccounts || [],
    });
    return walletService.invoke({
      scriptHash: sanitizeHex(verifierHash),
      operation: 'requestActionSession',
      args: [
        toByteArrayParam(accountIdHex),
        toStringParam(provider),
        toHash160Param(normalizeScriptHash(executor)),
        toIntegerParam(expiresAt),
        toStringParam(subjectPatch.encrypted_params),
      ],
    });
  }

  async finalizeRecovery({ verifierHash, accountIdHex } = {}) {
    return walletService.invoke({
      scriptHash: sanitizeHex(verifierHash),
      operation: 'finalizeRecovery',
      args: [
        toByteArrayParam(accountIdHex),
      ],
    });
  }

  async cancelRecovery({ verifierHash, accountIdHex } = {}) {
    return walletService.invoke({
      scriptHash: sanitizeHex(verifierHash),
      operation: 'cancelRecovery',
      args: [
        toByteArrayParam(accountIdHex),
      ],
    });
  }

  async revokeProxySession({ verifierHash, accountIdHex } = {}) {
    return walletService.invoke({
      scriptHash: sanitizeHex(verifierHash),
      operation: 'revokeActionSession',
      args: [
        toByteArrayParam(accountIdHex),
      ],
    });
  }
}

export const morpheusDidService = new MorpheusDidService();
