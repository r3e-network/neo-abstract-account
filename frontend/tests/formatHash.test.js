import test from 'node:test';
import assert from 'node:assert/strict';

import { formatHash } from '../src/utils/hex.js';

// Option shapes mirrored from the two production call sites that the shared
// helper consolidated:
//   - DEFAULT variant: ConsoleView.vue / HomeView.vue formatHash()
//       { notSetLabel: '--', separator: '...', shortCircuitLength: null }
//   - PANEL variant: SecurityDashboardPanel / Recovery / Timelock / TxPreview
//       defaults ('…' separator, shortCircuitLength 10) with a custom notSetLabel.
const DEFAULT_VARIANT = { notSetLabel: '--', separator: '...', shortCircuitLength: null };
const PANEL_VARIANT = { notSetLabel: 'Not Set' };

// --- Default (console/home) variant: '...' separator, '--' fallback, no short-circuit ---

test('default variant truncates a full-length hash as 0x<6>...<4> and strips 0x', () => {
  // 16 hex chars after the prefix -> head=first 6, tail=last 4.
  assert.equal(
    formatHash('0x1234567890abcdef', DEFAULT_VARIANT),
    '0x123456...cdef',
  );
  // Casing of the body is preserved (only the 0x prefix is stripped).
  assert.equal(
    formatHash('0xABCDEF1234567890', DEFAULT_VARIANT),
    '0xABCDEF...7890',
  );
});

test('default variant has no short-circuit: even short values are truncated', () => {
  // shortCircuitLength: null means the <=10 guard is disabled, so a 4-char
  // body still goes through slice(0,6)+sep+slice(-4). With overlap the head
  // and tail can repeat the same characters.
  assert.equal(formatHash('0xabcd', DEFAULT_VARIANT), '0xabcd...abcd');
});

test('default variant uses the custom -- fallback for empty/falsy input', () => {
  assert.equal(formatHash('', DEFAULT_VARIANT), '--');
  assert.equal(formatHash(undefined, DEFAULT_VARIANT), '--');
  assert.equal(formatHash(null, DEFAULT_VARIANT), '--');
});

// --- Panel variant: '…' separator, custom notSetLabel, shortCircuitLength <= 10 ---

test('panel variant returns short hashes untruncated via the <=10 guard', () => {
  // Body is exactly at the boundary (10 chars) -> returned as-is with 0x.
  assert.equal(
    formatHash(`0x${'a'.repeat(10)}`, PANEL_VARIANT),
    '0xaaaaaaaaaa',
  );
  // Below the boundary is also returned untruncated.
  assert.equal(formatHash('0xdeadbeef', PANEL_VARIANT), '0xdeadbeef');
});

test('panel variant truncates with the … glyph once the body exceeds 10 chars', () => {
  // 11-char body crosses the boundary -> truncate with the ellipsis glyph.
  assert.equal(
    formatHash('0xabcdefghijk', PANEL_VARIANT),
    '0xabcdef…hijk',
  );
  assert.notEqual(formatHash('0xabcdefghijk', PANEL_VARIANT).includes('...'), true);
});

test('panel variant uses the caller-supplied notSetLabel for empty input', () => {
  assert.equal(formatHash('', PANEL_VARIANT), 'Not Set');
  assert.equal(formatHash(null, PANEL_VARIANT), 'Not Set');
});

// --- Boundary of the short-circuit guard (panel-style options) ---

test('short-circuit boundary is inclusive at the configured length', () => {
  // length === shortCircuitLength -> untruncated (`<=` comparison).
  assert.equal(formatHash('abcdef', { shortCircuitLength: 6 }), '0xabcdef');
  // length === shortCircuitLength + 1 -> truncated.
  assert.equal(formatHash('abcdefg', { shortCircuitLength: 6 }), '0xabcdef…defg');
});

// --- Defaults applied when options are omitted entirely ---

test('formatHash falls back to documented defaults when options are omitted', () => {
  // Default notSetLabel is 'Unknown'.
  assert.equal(formatHash(''), 'Unknown');
  // Default separator is the … glyph and default shortCircuitLength is 10,
  // so a 12-char body is truncated with the ellipsis glyph.
  assert.equal(formatHash('0x1234567890ab'), '0x123456…90ab');
});

// --- 0x prefix handling shared by both variants ---

test('formatHash strips a leading 0x case-insensitively before truncating', () => {
  assert.equal(
    formatHash('0XABCDEF1234567890', DEFAULT_VARIANT),
    '0xABCDEF...7890',
  );
  // Only a single leading prefix is stripped; an interior "0x" is untouched.
  assert.equal(
    formatHash('0xab0xcdef1234', DEFAULT_VARIANT),
    '0xab0xcd...1234',
  );
});

test('formatHash treats a bare 0x prefix as an empty body', () => {
  // Cleaned body is '' -> head and tail slices are both empty around the sep.
  assert.equal(formatHash('0x', DEFAULT_VARIANT), '0x...');
});

// --- Falsy non-string inputs hit the early notSetLabel return ---

test('falsy non-string inputs return the notSetLabel without coercion', () => {
  // 0 and false are falsy -> early return, never reach String()/slice.
  assert.equal(formatHash(0, PANEL_VARIANT), 'Not Set');
  assert.equal(formatHash(false, DEFAULT_VARIANT), '--');
});

test('truthy non-string input is coerced via String() before truncation', () => {
  // A bigint with a long string form is coerced then truncated (no 0x prefix
  // to strip), exercising the String(value) branch.
  assert.equal(
    formatHash(12345678901234567890n, DEFAULT_VARIANT),
    '0x123456...7890',
  );
});
