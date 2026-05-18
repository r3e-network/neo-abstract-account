import { EC } from '../config/errorCodes.js';

const NEOFS_GATEWAY = 'https://rest.fs.neo.org';

const NEOFS_CONTAINER_ID = String(import.meta.env.VITE_NEOFS_CONTAINER_ID || '').trim();
if (import.meta.env.DEV && !import.meta.env.VITE_NEOFS_CONTAINER_ID) {
  console.warn('[neofsUpload] VITE_NEOFS_CONTAINER_ID is not set. NeoFS uploads will fail until this is configured.');
}

function requireNeoFSContainerId() {
  if (!NEOFS_CONTAINER_ID) throw new Error(EC.neofsNotConfigured);
  return NEOFS_CONTAINER_ID;
}

export function getNeoFSRetrieveUrl(objectId) {
  return `${NEOFS_GATEWAY}/v1/containers/${requireNeoFSContainerId()}/objects/${objectId}`;
}

// Callers should catch and re-throw with a translated message via toast.error(t('...'))
export async function uploadToNeoFS(file) {
  if (!file) throw new Error(EC.neofsNoFileProvided);
  const containerId = requireNeoFSContainerId();

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${NEOFS_GATEWAY}/v1/containers/${containerId}/objects`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(EC.neofsUploadFailed);
  }

  const json = await res.json().catch((err) => {
    if (import.meta.env.DEV) console.warn('[neofsUpload] Failed to parse response JSON:', err?.message);
    return null;
  });
  const objectId = json?.objectId || json?.id;
  if (!objectId) throw new Error(EC.neofsUploadFailed);

  return getNeoFSRetrieveUrl(objectId);
}
