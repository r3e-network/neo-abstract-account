import { EC } from '../config/errorCodes.js';

const API_PATH = '/api/account-metadata';

async function apiPost(body) {
  const res = await fetch(API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) {
    const err = new Error(EC.metadataRequestFailed);
    err.apiDetail = json.error || null;
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

export async function upsertAccountMetadata({ accountIdHash, description, logoUrl, metadataUri }) {
  return apiPost({ action: 'upsert', accountIdHash, description, logoUrl, metadataUri });
}
