create or replace function public.assert_aa_draft_activity_allowed(p_access_scope text, p_event jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  event_type text;
begin
  event_type := coalesce(nullif(trim(coalesce(p_event ->> 'type', '')), ''), '');

  if event_type = '' then
    raise exception 'draft_activity_scope_not_allowed';
  end if;

  if p_access_scope = 'sign' then
    if event_type <> 'signature_added' then
      raise exception 'draft_activity_scope_not_allowed';
    end if;
    return;
  end if;

  if p_access_scope = 'operate' then
    if event_type not in (
      'signature_added',
      'draft_created',
      'relay_preflight',
      'broadcast_client',
      'broadcast_relay',
      'collaborator_link_rotated',
      'operator_link_rotated'
    ) then
      raise exception 'draft_activity_scope_not_allowed';
    end if;
    return;
  end if;

  raise exception 'draft_activity_scope_not_allowed';
end;
$$;

create or replace function public.append_aa_draft_activity(p_share_slug text, p_access_slug text, p_event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
  next_activity jsonb;
  access_scope text;
begin
  draft_row := public.require_aa_draft_collaboration_access(p_share_slug, p_access_slug);
  access_scope := public.resolve_aa_draft_access_scope(draft_row, p_access_slug);
  perform public.assert_aa_draft_activity_allowed(access_scope, p_event);

  next_activity := (
    select coalesce(jsonb_agg(value order by ord), '[]'::jsonb)
    from (
      select value, ord
      from jsonb_array_elements(coalesce(draft_row.metadata -> 'activity', '[]'::jsonb) || jsonb_build_array(p_event)) with ordinality as item(value, ord)
      order by ord desc
      limit 100
    ) trimmed
  );

  update public.aa_transaction_drafts
  set metadata = coalesce(draft_row.metadata, '{}'::jsonb) || jsonb_build_object('activity', next_activity)
  where draft_id = draft_row.draft_id
  returning * into draft_row;

  return public.serialize_aa_transaction_draft(draft_row, access_scope, p_access_slug);
end;
$$;

grant execute on function public.assert_aa_draft_activity_allowed(text, jsonb) to anon;
grant execute on function public.append_aa_draft_activity(text, text, jsonb) to anon;
