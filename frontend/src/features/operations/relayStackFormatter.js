function decodeBase64ToBytes(value) {
  if (!value) return new Uint8Array();
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(value, 'base64'));
  }
  const binary = globalThis.atob ? globalThis.atob(value) : '';
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function decodeUtf8(bytes) {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    return decoder.decode(bytes);
  } catch {
    return '';
  }
}

function isPrintableUtf8(value) {
  if (!value) return false;
  if (value.includes('\uFFFD')) return false;
  return /^[\x09\x0A\x0D\x20-\x7E]*$/.test(value);
}

export function formatRelayStackItem(item = {}) {
  const type = String(item?.type || 'Unknown');
  const raw = item?.value;

  if (type === 'Integer') {
    return { type, raw, decoded: String(raw ?? '') };
  }

  if (type === 'Boolean') {
    return { type, raw, decoded: String(Boolean(raw)) };
  }

  if (type === 'ByteString') {
    const bytes = decodeBase64ToBytes(String(raw || ''));
    const hex = bytesToHex(bytes);
    const utf8 = decodeUtf8(bytes);
    const decoded = isPrintableUtf8(utf8)
      ? { hex, utf8 }
      : { hex };
    return { type, raw, decoded };
  }

  if (type === 'Array') {
    const values = Array.isArray(raw) ? raw : [];
    return {
      type,
      raw: values,
      decoded: values.map((entry) => formatRelayStackItem(entry)),
    };
  }

  if (type === 'Map') {
    const values = Array.isArray(raw) ? raw : [];
    return {
      type,
      raw: values,
      decoded: values.map((entry) => ({
        key: formatRelayStackItem(entry?.key || {}),
        value: formatRelayStackItem(entry?.value || {}),
      })),
    };
  }

  return {
    type,
    raw,
    decoded: raw,
  };
}

export function formatRelayStack(stack = []) {
  return (Array.isArray(stack) ? stack : []).map((entry) => formatRelayStackItem(entry));
}
