create or replace function public.append_aa_draft_submission_receipt(p_share_slug text, p_receipt jsonb)
returns public.aa_transaction_drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
  next_receipts jsonb;
begin
  select * into draft_row
  from public.aa_transaction_drafts
  where share_slug = p_share_slug
  limit 1;

  if not found then
    raise exception 'draft_not_found';
  end if;

  next_receipts := (
    select coalesce(jsonb_agg(value order by ord), '[]'::jsonb)
    from (
      select value, ord
      from jsonb_array_elements(coalesce(draft_row.metadata -> 'submissionReceipts', '[]'::jsonb) || jsonb_build_array(p_receipt)) with ordinality as item(value, ord)
      order by ord desc
      limit 12
    ) trimmed
  );

  update public.aa_transaction_drafts
  set metadata = coalesce(draft_row.metadata, '{}'::jsonb) || jsonb_build_object('submissionReceipts', next_receipts)
  where draft_id = draft_row.draft_id
  returning * into draft_row;

  return draft_row;
end;
$$;

grant execute on function public.append_aa_draft_submission_receipt(text, jsonb) to anon;
