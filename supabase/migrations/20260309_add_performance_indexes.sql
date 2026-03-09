-- Add performance indexes for frequently queried columns
-- Migration: 20260309_add_performance_indexes.sql

create index if not exists idx_aa_drafts_share_slug 
  on public.aa_transaction_drafts(share_slug);

create index if not exists idx_aa_drafts_operator_slug 
  on public.aa_transaction_drafts(operator_slug) 
  where operator_slug is not null;

create index if not exists idx_aa_drafts_collaboration_slug 
  on public.aa_transaction_drafts(collaboration_slug) 
  where collaboration_slug is not null;

create index if not exists idx_aa_drafts_status 
  on public.aa_transaction_drafts(status);

create index if not exists idx_aa_drafts_created_at 
  on public.aa_transaction_drafts(created_at desc);
