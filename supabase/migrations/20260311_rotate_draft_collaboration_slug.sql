create function public.rotate_aa_draft_collaboration_slug(p_share_slug text, p_collaboration_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
  next_collaboration_slug text;
begin
  draft_row := public.require_aa_draft_collaboration_access(p_share_slug, p_collaboration_slug);

  next_collaboration_slug := encode(gen_random_bytes(16), 'hex');
  while next_collaboration_slug = draft_row.share_slug or next_collaboration_slug = draft_row.collaboration_slug loop
    next_collaboration_slug := encode(gen_random_bytes(16), 'hex');
  end loop;

  update public.aa_transaction_drafts
  set collaboration_slug = next_collaboration_slug
  where draft_id = draft_row.draft_id
  returning * into draft_row;

  return public.serialize_aa_transaction_draft(draft_row, true, next_collaboration_slug);
end;
$$;

grant execute on function public.rotate_aa_draft_collaboration_slug(text, text) to anon;
