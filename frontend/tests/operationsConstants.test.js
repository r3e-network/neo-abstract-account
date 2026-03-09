import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  DEFAULT_ACTIVITY_HISTORY_LIMIT,
  DEFAULT_SUBMISSION_RECEIPT_HISTORY_LIMIT,
  DRAFT_METADATA_HISTORY_LIMITS,
} from '../src/features/operations/constants.js';
import { MAX_ACTIVITY_ENTRIES } from '../src/features/operations/activity.js';
import { MAX_SUBMISSION_RECEIPTS } from '../src/features/operations/submissionReceipts.js';

test('draft metadata retention policy exposes activity and receipt limits', () => {
  assert.deepEqual(DRAFT_METADATA_HISTORY_LIMITS, {
    activity: 100,
    submissionReceipts: 12,
  });
  assert.equal(DEFAULT_ACTIVITY_HISTORY_LIMIT, 100);
  assert.equal(DEFAULT_SUBMISSION_RECEIPT_HISTORY_LIMIT, 12);
});

test('activity and submission receipt helpers derive their caps from the shared policy', () => {
  assert.equal(MAX_ACTIVITY_ENTRIES, DRAFT_METADATA_HISTORY_LIMITS.activity);
  assert.equal(MAX_SUBMISSION_RECEIPTS, DRAFT_METADATA_HISTORY_LIMITS.submissionReceipts);
});

test('supabase append-only metadata migrations stay aligned with the shared retention policy', () => {
  const activitySql = fs.readFileSync(path.resolve('../supabase/migrations/20260308_home_operations_workspace.sql'), 'utf8');
  const receiptSql = fs.readFileSync(path.resolve('../supabase/migrations/20260309_submission_receipts.sql'), 'utf8');

  assert.match(activitySql, /limit 100/i);
  assert.match(receiptSql, /limit 12/i);
});
