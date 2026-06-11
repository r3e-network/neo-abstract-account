-- Add performance indexes for frequently queried columns
-- Migration: 20260309_add_performance_indexes.sql
--
-- NOTE: this file was authored after 20260312_scoped_draft_access.sql but kept
-- its original date, so in filename-order replays it runs before the
-- operator_slug and collaboration_slug columns exist. Those two indexes are
-- therefore created only when their column is already present (live databases
-- that applied the chain incrementally); fresh replays get them from
-- 20260611_draft_metadata_hardening.sql instead.

create index if not exists idx_aa_drafts_share_slug
  on public.aa_transaction_drafts(share_slug);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'aa_transaction_drafts'
      and column_name = 'operator_slug'
  ) then
    create index if not exists idx_aa_drafts_operator_slug
      on public.aa_transaction_drafts(operator_slug)
      where operator_slug is not null;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'aa_transaction_drafts'
      and column_name = 'collaboration_slug'
  ) then
    create index if not exists idx_aa_drafts_collaboration_slug
      on public.aa_transaction_drafts(collaboration_slug)
      where collaboration_slug is not null;
  end if;
end $$;

create index if not exists idx_aa_drafts_status
  on public.aa_transaction_drafts(status);

create index if not exists idx_aa_drafts_created_at
  on public.aa_transaction_drafts(created_at desc);
