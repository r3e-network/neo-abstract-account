revoke execute on function public.set_aa_draft_relay_preflight(text, jsonb) from anon;
revoke execute on function public.append_aa_draft_submission_receipt(text, jsonb) from anon;

drop function if exists public.set_aa_draft_relay_preflight(text, jsonb);
drop function if exists public.append_aa_draft_submission_receipt(text, jsonb);

grant execute on function public.get_aa_draft_by_share_slug(text, text) to anon;
grant execute on function public.append_aa_draft_signature(text, text, jsonb) to anon;
grant execute on function public.set_aa_draft_status(text, text, text) to anon;
grant execute on function public.append_aa_draft_activity(text, text, jsonb) to anon;
grant execute on function public.set_aa_draft_relay_preflight(text, text, jsonb) to anon;
grant execute on function public.append_aa_draft_submission_receipt(text, text, jsonb) to anon;
