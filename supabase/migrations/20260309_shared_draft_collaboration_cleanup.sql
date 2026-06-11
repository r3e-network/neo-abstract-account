-- In filename-order replays the legacy single-access-slug signatures may have
-- already been dropped by 20260309_shared_draft_collaboration_capability.sql
-- (or never created yet), and REVOKE has no IF EXISTS, so guard each revoke on
-- the function actually existing.
do $$
begin
  if to_regprocedure('public.set_aa_draft_relay_preflight(text, jsonb)') is not null then
    revoke execute on function public.set_aa_draft_relay_preflight(text, jsonb) from anon;
  end if;
  if to_regprocedure('public.append_aa_draft_submission_receipt(text, jsonb)') is not null then
    revoke execute on function public.append_aa_draft_submission_receipt(text, jsonb) from anon;
  end if;
end $$;

drop function if exists public.set_aa_draft_relay_preflight(text, jsonb);
drop function if exists public.append_aa_draft_submission_receipt(text, jsonb);

grant execute on function public.get_aa_draft_by_share_slug(text, text) to anon;
grant execute on function public.append_aa_draft_signature(text, text, jsonb) to anon;
grant execute on function public.set_aa_draft_status(text, text, text) to anon;
grant execute on function public.append_aa_draft_activity(text, text, jsonb) to anon;
grant execute on function public.set_aa_draft_relay_preflight(text, text, jsonb) to anon;
grant execute on function public.append_aa_draft_submission_receipt(text, text, jsonb) to anon;
