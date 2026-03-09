alter table public.aa_transaction_drafts
  add column if not exists operator_public_key jsonb,
  add column if not exists operator_key_claimed_at timestamptz,
  add column if not exists operator_counter bigint not null default 0;

revoke execute on function public.set_aa_draft_status(text, text, text) from anon;
revoke execute on function public.set_aa_draft_relay_preflight(text, text, jsonb) from anon;
revoke execute on function public.append_aa_draft_submission_receipt(text, text, jsonb) from anon;
revoke execute on function public.rotate_aa_draft_collaboration_slug(text, text) from anon;
revoke execute on function public.rotate_aa_draft_operator_slug(text, text) from anon;
