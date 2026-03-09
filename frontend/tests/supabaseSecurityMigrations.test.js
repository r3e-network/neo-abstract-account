import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const sharedCapabilityMigration = fs.readFileSync(
  path.resolve('../supabase/migrations/20260309_shared_draft_collaboration_capability.sql'),
  'utf8',
);

const submissionReceiptsMigrationPath = path.resolve('../supabase/migrations/20260309_submission_receipts.sql');
const submissionReceiptsMigration = fs.readFileSync(submissionReceiptsMigrationPath, 'utf8');
const cleanupMigrationPath = path.resolve('../supabase/migrations/20260310_shared_draft_collaboration_cleanup.sql');
const rotationMigrationPath = path.resolve('../supabase/migrations/20260311_rotate_draft_collaboration_slug.sql');
const scopedAccessMigrationPath = path.resolve('../supabase/migrations/20260312_scoped_draft_access.sql');
const activityScopeMigrationPath = path.resolve('../supabase/migrations/20260313_activity_scope_guards.sql');
const signedOperatorMigrationPath = path.resolve('../supabase/migrations/20260314_signed_operator_mutations.sql');

test('shared draft capability migration requires collaborator slugs for all anonymous write RPCs', () => {
  assert.match(sharedCapabilityMigration, /create function public\.append_aa_draft_signature\(p_share_slug text, p_collaboration_slug text, p_signature jsonb\)/);
  assert.match(sharedCapabilityMigration, /create function public\.set_aa_draft_status\(p_share_slug text, p_collaboration_slug text, p_status text\)/);
  assert.match(sharedCapabilityMigration, /create function public\.append_aa_draft_activity\(p_share_slug text, p_collaboration_slug text, p_event jsonb\)/);
  assert.match(sharedCapabilityMigration, /create function public\.set_aa_draft_relay_preflight\(p_share_slug text, p_collaboration_slug text, p_relay_preflight jsonb\)/);
  assert.match(sharedCapabilityMigration, /create function public\.append_aa_draft_submission_receipt\(p_share_slug text, p_collaboration_slug text, p_receipt jsonb\)/);
  assert.match(sharedCapabilityMigration, /require_aa_draft_collaboration_access/);
});

test('collaborator link rotation migration exists and exposes an anon-callable rotation RPC', () => {
  assert.ok(fs.existsSync(rotationMigrationPath), 'expected a rotation migration');
  const rotationMigration = fs.readFileSync(rotationMigrationPath, 'utf8');
  assert.match(rotationMigration, /create function public\.rotate_aa_draft_collaboration_slug\(p_share_slug text, p_collaboration_slug text\)/);
  assert.match(rotationMigration, /require_aa_draft_collaboration_access/);
  assert.match(rotationMigration, /grant execute on function public\.rotate_aa_draft_collaboration_slug\(text, text\) to anon/);
});

test('scoped access migration adds operator-only access for broadcast-class mutations', () => {
  assert.ok(fs.existsSync(scopedAccessMigrationPath), 'expected a scoped access migration');
  const scopedAccessMigration = fs.readFileSync(scopedAccessMigrationPath, 'utf8');
  assert.match(scopedAccessMigration, /add column if not exists operator_slug text/);
  assert.match(scopedAccessMigration, /'access_scope'/);
  assert.match(scopedAccessMigration, /'can_operate'/);
  assert.match(scopedAccessMigration, /create or replace function public\.require_aa_draft_operator_access\(p_share_slug text, p_access_slug text\)/);
  assert.match(scopedAccessMigration, /create function public\.rotate_aa_draft_operator_slug\(p_share_slug text, p_access_slug text\)/);
  assert.match(scopedAccessMigration, /grant execute on function public\.rotate_aa_draft_operator_slug\(text, text\) to anon/);
});

test('activity scope migration restricts collaborator links from forging operator timeline events', () => {
  assert.ok(fs.existsSync(activityScopeMigrationPath), 'expected an activity scope migration');
  const activityScopeMigration = fs.readFileSync(activityScopeMigrationPath, 'utf8');
  assert.match(activityScopeMigration, /assert_aa_draft_activity_allowed/);
  assert.match(activityScopeMigration, /draft_activity_scope_not_allowed/);
  assert.match(activityScopeMigration, /append_aa_draft_activity\(p_share_slug text, p_access_slug text, p_event jsonb\)/);
});

test('signed operator mutation migration adds operator key state and revokes direct anon operator RPCs', () => {
  assert.ok(fs.existsSync(signedOperatorMigrationPath), 'expected a signed operator mutation migration');
  const signedOperatorMigration = fs.readFileSync(signedOperatorMigrationPath, 'utf8');
  assert.match(signedOperatorMigration, /add column if not exists operator_public_key jsonb/);
  assert.match(signedOperatorMigration, /add column if not exists operator_counter bigint/);
  assert.match(signedOperatorMigration, /revoke execute on function public\.set_aa_draft_status\(text, text, text\) from anon/);
  assert.match(signedOperatorMigration, /revoke execute on function public\.set_aa_draft_relay_preflight\(text, text, jsonb\) from anon/);
  assert.match(signedOperatorMigration, /revoke execute on function public\.append_aa_draft_submission_receipt\(text, text, jsonb\) from anon/);
  assert.match(signedOperatorMigration, /revoke execute on function public\.rotate_aa_draft_collaboration_slug\(text, text\) from anon/);
  assert.match(signedOperatorMigration, /revoke execute on function public\.rotate_aa_draft_operator_slug\(text, text\) from anon/);
});

test('legacy write RPC cleanup migration runs after the receipt migration on fresh installs', () => {
  assert.match(submissionReceiptsMigration, /create or replace function public\.append_aa_draft_submission_receipt\(p_share_slug text, p_receipt jsonb\)/);
  assert.ok(fs.existsSync(cleanupMigrationPath), 'expected a follow-up cleanup migration after submission receipts');

  const submissionName = path.basename(submissionReceiptsMigrationPath);
  const cleanupName = path.basename(cleanupMigrationPath);
  assert.ok(cleanupName > submissionName, `${cleanupName} must sort after ${submissionName}`);

  const cleanupMigration = fs.readFileSync(cleanupMigrationPath, 'utf8');
  assert.match(cleanupMigration, /drop function if exists public\.append_aa_draft_submission_receipt\(text, jsonb\)/);
  assert.match(cleanupMigration, /drop function if exists public\.set_aa_draft_relay_preflight\(text, jsonb\)/);
  assert.match(cleanupMigration, /grant execute on function public\.append_aa_draft_submission_receipt\(text, text, jsonb\) to anon/);
  assert.match(cleanupMigration, /grant execute on function public\.set_aa_draft_relay_preflight\(text, text, jsonb\) to anon/);
});
