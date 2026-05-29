export function sanitizeHex(value) {
  return String(value || '').replace(/^0x/i, '').toLowerCase();
}

/**
 * Format a hash/hex string for compact display as `0x<head>…<tail>`.
 *
 * Behavior matches the previously-duplicated inline helpers:
 * - Strips a leading `0x` (case-insensitive) before truncating.
 * - When `shortCircuitLength` is set and the cleaned value is at or below it,
 *   the value is returned untruncated (preserves the panels' `length <= 10` guard).
 * - Falls back to `notSetLabel` when the input is empty/falsy.
 *
 * @param {string} value Raw hash value (with or without `0x`).
 * @param {object} [options]
 * @param {string} [options.notSetLabel='Unknown'] Returned for empty input.
 * @param {string} [options.separator='…'] Glyph placed between head and tail.
 * @param {number|null} [options.shortCircuitLength=10] Length at/below which the
 *   cleaned value is returned untruncated; pass `null` to always truncate.
 * @returns {string}
 */
export function formatHash(value, {
  notSetLabel = 'Unknown',
  separator = '…',
  shortCircuitLength = 10,
} = {}) {
  if (!value) return notSetLabel;
  const clean = String(value).replace(/^0x/i, '');
  if (shortCircuitLength != null && clean.length <= shortCircuitLength) {
    return `0x${clean}`;
  }
  return `0x${clean.slice(0, 6)}${separator}${clean.slice(-4)}`;
}
