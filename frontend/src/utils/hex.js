export function sanitizeHex(value) {
  return String(value || '').replace(/^0x/i, '').toLowerCase();
}
