create or replace function public.set_aa_draft_relay_preflight(p_share_slug text, p_relay_preflight jsonb)
returns public.aa_transaction_drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
begin
  update public.aa_transaction_drafts
  set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('relayPreflight', coalesce(p_relay_preflight, 'null'::jsonb))
  where share_slug = p_share_slug
  returning * into draft_row;

  if not found then
    raise exception 'draft_not_found';
  end if;

  return draft_row;
end;
$$;

revoke execute on function public.patch_aa_draft_metadata(text, jsonb) from anon;
grant execute on function public.set_aa_draft_relay_preflight(text, jsonb) to anon;
