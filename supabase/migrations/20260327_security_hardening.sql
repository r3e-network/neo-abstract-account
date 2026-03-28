-- Security hardening migration
-- Addresses: RLS policy fixes, TOCTOU race condition, status validation,
--            duplicate index cleanup, and missing trigger.
--
-- NOTE: 20260310_shared_draft_collaboration_cleanup.sql is NOT a duplicate of
-- 20260309_shared_draft_collaboration_capability.sql. The cleanup migration
-- revokes/drops old single-arg function signatures and re-grants permissions
-- for the new multi-arg signatures introduced in 20260309.

-- =============================================================================
-- FIX 1: Remove overly permissive RLS policies on aa_account_metadata
-- =============================================================================
-- The current INSERT/UPDATE policies use `with check (true)` / `using (true)`,
-- which allows any role (including anon) to write. Service role bypasses RLS
-- entirely, so these policies only serve to open the door to anon/authenticated.

drop policy if exists "Service role insert aa_account_metadata" on aa_account_metadata;
drop policy if exists "Service role update aa_account_metadata" on aa_account_metadata;

-- Explicitly revoke direct table mutations from non-service roles.
revoke insert, update, delete on aa_account_metadata from anon;
revoke insert, update, delete on aa_account_metadata from authenticated;

-- =============================================================================
-- FIX 2: Explicit REVOKE on aa_transaction_drafts
-- =============================================================================
-- RLS is enabled but no SELECT/INSERT/UPDATE/DELETE policies exist for
-- anon/authenticated. Make the intent explicit: all access goes through
-- security-definer functions.

revoke all on aa_transaction_drafts from anon;
revoke all on aa_transaction_drafts from authenticated;

-- =============================================================================
-- FIX 3: Fix TOCTOU race in append_aa_draft_signature
-- =============================================================================
-- The current implementation reads the row without locking, checks for
-- duplicate signatures, then updates. A concurrent call can read the same
-- snapshot and both append, resulting in duplicate signatures.
-- Fix: use SELECT ... FOR UPDATE inside require_aa_draft_collaboration_access
-- call path. Since require_aa_draft_collaboration_access is shared by other
-- functions, we lock the row inside append_aa_draft_signature itself.

create or replace function public.append_aa_draft_signature(p_share_slug text, p_access_slug text, p_signature jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
  next_signatures jsonb;
  access_scope text;
begin
  -- Verify collaboration access first (unchanged)
  draft_row := public.require_aa_draft_collaboration_access(p_share_slug, p_access_slug);
  access_scope := public.resolve_aa_draft_access_scope(draft_row, p_access_slug);

  -- Re-select with FOR UPDATE to prevent TOCTOU race on signatures
  select * into draft_row
  from public.aa_transaction_drafts
  where draft_id = draft_row.draft_id
  for update;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(draft_row.signatures, '[]'::jsonb)) as item
    where item ->> 'kind' = p_signature ->> 'kind'
      and item ->> 'signerId' = p_signature ->> 'signerId'
  ) then
    return public.serialize_aa_transaction_draft(draft_row, access_scope, p_access_slug);
  end if;

  next_signatures := coalesce(draft_row.signatures, '[]'::jsonb) || jsonb_build_array(p_signature);

  update public.aa_transaction_drafts
  set signatures = next_signatures
  where draft_id = draft_row.draft_id
  returning * into draft_row;

  return public.serialize_aa_transaction_draft(draft_row, access_scope, p_access_slug);
end;
$$;

-- =============================================================================
-- FIX 4: Validate status in set_aa_draft_status
-- =============================================================================
-- The table has a CHECK constraint, but an invalid status would surface as an
-- opaque constraint-violation error. Validate explicitly for a clear message.

create or replace function public.set_aa_draft_status(p_share_slug text, p_access_slug text, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
begin
  if p_status not in ('draft', 'broadcasted', 'relayed', 'completed', 'cancelled') then
    raise exception 'Invalid status: %', p_status;
  end if;

  draft_row := public.require_aa_draft_operator_access(p_share_slug, p_access_slug);

  update public.aa_transaction_drafts
  set status = p_status
  where draft_id = draft_row.draft_id
  returning * into draft_row;

  return public.serialize_aa_transaction_draft(draft_row, 'operate', p_access_slug);
end;
$$;

-- =============================================================================
-- FIX 5: Remove duplicate index on share_slug
-- =============================================================================
-- idx_aa_drafts_share_slug (from 20260309_add_performance_indexes.sql)
-- duplicates the index already backing the UNIQUE constraint on share_slug
-- (created in 20260308_home_operations_workspace.sql as
-- aa_transaction_drafts_share_slug_idx, plus the implicit unique-constraint
-- index).

drop index if exists idx_aa_drafts_share_slug;

-- =============================================================================
-- FIX 6: Add updated_at trigger for aa_account_metadata
-- =============================================================================
-- The table has an updated_at column but no trigger to maintain it (unlike
-- aa_transaction_drafts which has touch_aa_transaction_drafts_updated_at).

create or replace function touch_aa_account_metadata_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_aa_account_metadata_updated_at on aa_account_metadata;
create trigger trg_aa_account_metadata_updated_at
  before update on aa_account_metadata
  for each row execute function touch_aa_account_metadata_updated_at();
