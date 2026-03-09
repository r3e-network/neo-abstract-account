alter table public.aa_transaction_drafts
  add column if not exists collaboration_slug text;

update public.aa_transaction_drafts
set collaboration_slug = encode(gen_random_bytes(16), 'hex')
where nullif(collaboration_slug, '') is null;

alter table public.aa_transaction_drafts
  alter column collaboration_slug set not null;

create unique index if not exists aa_transaction_drafts_collaboration_slug_idx
  on public.aa_transaction_drafts (collaboration_slug);

create or replace function public.serialize_aa_transaction_draft(
  p_draft public.aa_transaction_drafts,
  p_can_write boolean default false,
  p_collaboration_slug text default null
)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'draft_id', p_draft.draft_id,
    'share_slug', p_draft.share_slug,
    'status', p_draft.status,
    'account', coalesce(p_draft.account, '{}'::jsonb),
    'operation_body', p_draft.operation_body,
    'transaction_body', p_draft.transaction_body,
    'signer_requirements', coalesce(p_draft.signer_requirements, '[]'::jsonb),
    'signatures', coalesce(p_draft.signatures, '[]'::jsonb),
    'broadcast_mode', p_draft.broadcast_mode,
    'metadata', coalesce(p_draft.metadata, '{}'::jsonb),
    'share_path', coalesce(p_draft.share_path, '/tx/' || p_draft.share_slug),
    'created_at', p_draft.created_at,
    'updated_at', p_draft.updated_at,
    'can_write', p_can_write
  ) || case
    when p_can_write and nullif(coalesce(p_collaboration_slug, p_draft.collaboration_slug), '') is not null then jsonb_build_object(
      'collaboration_slug', coalesce(p_collaboration_slug, p_draft.collaboration_slug),
      'collaboration_path', '/tx/' || p_draft.share_slug || '?access=' || coalesce(p_collaboration_slug, p_draft.collaboration_slug)
    )
    else '{}'::jsonb
  end;
$$;

drop function if exists public.create_aa_draft(jsonb);
create function public.create_aa_draft(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
  next_draft_id uuid;
  next_share_slug text;
  next_collaboration_slug text;
begin
  begin
    next_draft_id := nullif(p_payload ->> 'draft_id', '')::uuid;
  exception
    when others then
      next_draft_id := gen_random_uuid();
  end;

  next_share_slug := coalesce(nullif(p_payload ->> 'share_slug', ''), encode(gen_random_bytes(16), 'hex'));
  next_collaboration_slug := coalesce(nullif(p_payload ->> 'collaboration_slug', ''), encode(gen_random_bytes(16), 'hex'));

  if next_collaboration_slug = next_share_slug then
    next_collaboration_slug := encode(gen_random_bytes(16), 'hex');
  end if;

  insert into public.aa_transaction_drafts (
    draft_id,
    share_slug,
    collaboration_slug,
    status,
    account,
    operation_body,
    transaction_body,
    signer_requirements,
    signatures,
    broadcast_mode,
    metadata,
    share_path
  )
  values (
    coalesce(next_draft_id, gen_random_uuid()),
    next_share_slug,
    next_collaboration_slug,
    coalesce(nullif(p_payload ->> 'status', ''), 'draft'),
    coalesce(p_payload -> 'account', '{}'::jsonb),
    p_payload -> 'operation_body',
    p_payload -> 'transaction_body',
    coalesce(p_payload -> 'signer_requirements', '[]'::jsonb),
    coalesce(p_payload -> 'signatures', '[]'::jsonb),
    coalesce(nullif(p_payload ->> 'broadcast_mode', ''), 'client'),
    coalesce(p_payload -> 'metadata', '{}'::jsonb),
    coalesce(nullif(p_payload ->> 'share_path', ''), '/tx/' || next_share_slug)
  )
  returning * into draft_row;

  return public.serialize_aa_transaction_draft(draft_row, true, draft_row.collaboration_slug);
end;
$$;

drop function if exists public.get_aa_draft_by_share_slug(text);
create function public.get_aa_draft_by_share_slug(p_share_slug text, p_collaboration_slug text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
  can_write boolean := false;
begin
  select * into draft_row
  from public.aa_transaction_drafts
  where share_slug = p_share_slug
  limit 1;

  if not found then
    raise exception 'draft_not_found';
  end if;

  can_write := nullif(p_collaboration_slug, '') is not null and draft_row.collaboration_slug = p_collaboration_slug;
  return public.serialize_aa_transaction_draft(draft_row, can_write, case when can_write then p_collaboration_slug else null end);
end;
$$;

create or replace function public.require_aa_draft_collaboration_access(
  p_share_slug text,
  p_collaboration_slug text
)
returns public.aa_transaction_drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
begin
  select * into draft_row
  from public.aa_transaction_drafts
  where share_slug = p_share_slug
    and collaboration_slug = p_collaboration_slug
  limit 1;

  if not found then
    raise exception 'draft_collaboration_access_required';
  end if;

  return draft_row;
end;
$$;

drop function if exists public.append_aa_draft_signature(text, jsonb);
create function public.append_aa_draft_signature(p_share_slug text, p_collaboration_slug text, p_signature jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
  next_signatures jsonb;
begin
  draft_row := public.require_aa_draft_collaboration_access(p_share_slug, p_collaboration_slug);

  if exists (
    select 1
    from jsonb_array_elements(coalesce(draft_row.signatures, '[]'::jsonb)) as item
    where item ->> 'kind' = p_signature ->> 'kind'
      and item ->> 'signerId' = p_signature ->> 'signerId'
  ) then
    return public.serialize_aa_transaction_draft(draft_row, true, p_collaboration_slug);
  end if;

  next_signatures := coalesce(draft_row.signatures, '[]'::jsonb) || jsonb_build_array(p_signature);

  update public.aa_transaction_drafts
  set signatures = next_signatures
  where draft_id = draft_row.draft_id
  returning * into draft_row;

  return public.serialize_aa_transaction_draft(draft_row, true, p_collaboration_slug);
end;
$$;

drop function if exists public.set_aa_draft_status(text, text);
create function public.set_aa_draft_status(p_share_slug text, p_collaboration_slug text, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
begin
  draft_row := public.require_aa_draft_collaboration_access(p_share_slug, p_collaboration_slug);

  update public.aa_transaction_drafts
  set status = p_status
  where draft_id = draft_row.draft_id
  returning * into draft_row;

  return public.serialize_aa_transaction_draft(draft_row, true, p_collaboration_slug);
end;
$$;

drop function if exists public.append_aa_draft_activity(text, jsonb);
create function public.append_aa_draft_activity(p_share_slug text, p_collaboration_slug text, p_event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
  next_activity jsonb;
begin
  draft_row := public.require_aa_draft_collaboration_access(p_share_slug, p_collaboration_slug);

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

  return public.serialize_aa_transaction_draft(draft_row, true, p_collaboration_slug);
end;
$$;

drop function if exists public.set_aa_draft_relay_preflight(text, jsonb);
create function public.set_aa_draft_relay_preflight(p_share_slug text, p_collaboration_slug text, p_relay_preflight jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
begin
  draft_row := public.require_aa_draft_collaboration_access(p_share_slug, p_collaboration_slug);

  update public.aa_transaction_drafts
  set metadata = coalesce(draft_row.metadata, '{}'::jsonb) || jsonb_build_object('relayPreflight', coalesce(p_relay_preflight, 'null'::jsonb))
  where draft_id = draft_row.draft_id
  returning * into draft_row;

  return public.serialize_aa_transaction_draft(draft_row, true, p_collaboration_slug);
end;
$$;

drop function if exists public.append_aa_draft_submission_receipt(text, jsonb);
create function public.append_aa_draft_submission_receipt(p_share_slug text, p_collaboration_slug text, p_receipt jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
  next_receipts jsonb;
begin
  draft_row := public.require_aa_draft_collaboration_access(p_share_slug, p_collaboration_slug);

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

  return public.serialize_aa_transaction_draft(draft_row, true, p_collaboration_slug);
end;
$$;

grant execute on function public.create_aa_draft(jsonb) to anon;
grant execute on function public.get_aa_draft_by_share_slug(text, text) to anon;
grant execute on function public.append_aa_draft_signature(text, text, jsonb) to anon;
grant execute on function public.set_aa_draft_status(text, text, text) to anon;
grant execute on function public.append_aa_draft_activity(text, text, jsonb) to anon;
grant execute on function public.set_aa_draft_relay_preflight(text, text, jsonb) to anon;
grant execute on function public.append_aa_draft_submission_receipt(text, text, jsonb) to anon;
