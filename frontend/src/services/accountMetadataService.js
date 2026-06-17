import { EC } from '../config/errorCodes.js';
import { fetchWithTimeout } from '../utils/fetchWithTimeout.js';

const API_PATH = '/api/account-metadata';

async function apiPost(body) {
  const res = await fetchWithTimeout(API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    const err = new Error(EC.metadataRequestFailed);
    err.apiDetail = json.error || `HTTP ${res.status}`;
    throw err;
  }
  return json;
}

export async function fetchAccountMetadata(accountIdHash) {
  const json = await apiPost({ action: 'get', accountIdHash });
  return json.metadata;
}

export async function fetchAccountMetadataBatch(accountIdHashes) {
  if (!accountIdHashes.length) return {};
  const json = await apiPost({ action: 'getBatch', accountIdHashes });
  return json.map;
}

export async function upsertAccountMetadata({ accountIdHash, description, logoUrl, metadataUri, idToken, ownerProof }) {
  const body = { action: 'upsert', accountIdHash, description, logoUrl, metadataUri };
  // Proof of account control: the server requires either a Web3Auth idToken whose
  // key controls the account, or a backup-owner signature bound to the account.
  if (idToken) body.idToken = idToken;
  if (ownerProof) body.ownerProof = ownerProof;
  return apiPost(body);
}
