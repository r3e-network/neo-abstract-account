import { EC } from '../config/errorCodes.js';

const NEOFS_GATEWAY = 'https://rest.fs.neo.org';

// Container ID should be configured via the VITE_NEOFS_CONTAINER_ID environment variable.
// The fallback value is a development placeholder and will not work in production.
const NEOFS_CONTAINER_ID = import.meta.env.VITE_NEOFS_CONTAINER_ID || 'UNCONFIGURED_NEOFS_CONTAINER_ID';
if (import.meta.env.DEV && !import.meta.env.VITE_NEOFS_CONTAINER_ID) {
  console.warn('[neofsUpload] VITE_NEOFS_CONTAINER_ID is not set. NeoFS uploads will fail until this is configured.');
}

export function getNeoFSRetrieveUrl(objectId) {
  return `${NEOFS_GATEWAY}/v1/containers/${NEOFS_CONTAINER_ID}/objects/${objectId}`;
}

// Callers should catch and re-throw with a translated message via toast.error(t('...'))
export async function uploadToNeoFS(file) {
  if (!file) throw new Error(EC.neofsNoFileProvided);
  if (!NEOFS_CONTAINER_ID || NEOFS_CONTAINER_ID === 'UNCONFIGURED_NEOFS_CONTAINER_ID') {
    throw new Error(EC.neofsNotConfigured);
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${NEOFS_GATEWAY}/v1/containers/${NEOFS_CONTAINER_ID}/objects`, {
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
