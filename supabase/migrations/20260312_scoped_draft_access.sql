alter table public.aa_transaction_drafts
  add column if not exists operator_slug text;

update public.aa_transaction_drafts
set operator_slug = encode(gen_random_bytes(16), 'hex')
where nullif(operator_slug, '') is null;

update public.aa_transaction_drafts
set operator_slug = encode(gen_random_bytes(16), 'hex')
where operator_slug = share_slug
   or operator_slug = collaboration_slug;

alter table public.aa_transaction_drafts
  alter column operator_slug set not null;

create unique index if not exists aa_transaction_drafts_operator_slug_idx
  on public.aa_transaction_drafts (operator_slug);

drop function if exists public.serialize_aa_transaction_draft(public.aa_transaction_drafts, boolean, text);
create function public.serialize_aa_transaction_draft(
  p_draft public.aa_transaction_drafts,
  p_access_scope text default 'read',
  p_access_slug text default null
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
    'access_scope', p_access_scope,
    'can_write', p_access_scope in ('sign', 'operate'),
    'can_operate', p_access_scope = 'operate'
  )
  || case
    when p_access_scope in ('sign', 'operate') then jsonb_build_object(
      'collaboration_slug', p_draft.collaboration_slug,
      'collaboration_path', '/tx/' || p_draft.share_slug || '?access=' || p_draft.collaboration_slug
    )
    else '{}'::jsonb
  end
  || case
    when p_access_scope = 'operate' then jsonb_build_object(
      'operator_slug', p_draft.operator_slug,
      'operator_path', '/tx/' || p_draft.share_slug || '?access=' || p_draft.operator_slug
    )
    else '{}'::jsonb
  end;
$$;

create or replace function public.resolve_aa_draft_access_scope(
  p_draft public.aa_transaction_drafts,
  p_access_slug text default null
)
returns text
language sql
stable
set search_path = public
as $$
  select case
    when nullif(p_access_slug, '') is null then 'read'
    when p_draft.operator_slug = p_access_slug then 'operate'
    when p_draft.collaboration_slug = p_access_slug then 'sign'
    else 'read'
  end;
$$;

create or replace function public.require_aa_draft_collaboration_access(p_share_slug text, p_access_slug text)
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
    and (collaboration_slug = p_access_slug or operator_slug = p_access_slug)
  limit 1;

  if not found then
    raise exception 'draft_collaboration_access_required';
  end if;

  return draft_row;
end;
$$;

create or replace function public.require_aa_draft_operator_access(p_share_slug text, p_access_slug text)
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
    and operator_slug = p_access_slug
  limit 1;

  if not found then
    raise exception 'draft_operator_access_required';
  end if;

  return draft_row;
end;
$$;

create or replace function public.create_aa_draft(p_payload jsonb)
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
  next_operator_slug text;
begin
  begin
    next_draft_id := nullif(p_payload ->> 'draft_id', '')::uuid;
  exception
    when others then
      next_draft_id := gen_random_uuid();
  end;

  next_share_slug := coalesce(nullif(p_payload ->> 'share_slug', ''), encode(gen_random_bytes(16), 'hex'));
  next_collaboration_slug := coalesce(nullif(p_payload ->> 'collaboration_slug', ''), encode(gen_random_bytes(16), 'hex'));
  while next_collaboration_slug = next_share_slug loop
    next_collaboration_slug := encode(gen_random_bytes(16), 'hex');
  end loop;

  next_operator_slug := coalesce(nullif(p_payload ->> 'operator_slug', ''), encode(gen_random_bytes(16), 'hex'));
  while next_operator_slug = next_share_slug or next_operator_slug = next_collaboration_slug loop
    next_operator_slug := encode(gen_random_bytes(16), 'hex');
  end loop;

  insert into public.aa_transaction_drafts (
    draft_id,
    share_slug,
    collaboration_slug,
    operator_slug,
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
    next_operator_slug,
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

  return public.serialize_aa_transaction_draft(draft_row, 'operate', draft_row.operator_slug);
end;
$$;

create or replace function public.get_aa_draft_by_share_slug(p_share_slug text, p_access_slug text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
  access_scope text;
begin
  select * into draft_row
  from public.aa_transaction_drafts
  where share_slug = p_share_slug
  limit 1;

  if not found then
    raise exception 'draft_not_found';
  end if;

  access_scope := public.resolve_aa_draft_access_scope(draft_row, p_access_slug);
  return public.serialize_aa_transaction_draft(draft_row, access_scope, p_access_slug);
end;
$$;

create or replace function public.append_aa_draft_signature(p_share_slug text, p_access_slug text, p_signature jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
  next_signatures jsonb;
  access_scope text;
begin
  draft_row := public.require_aa_draft_collaboration_access(p_share_slug, p_access_slug);
  access_scope := public.resolve_aa_draft_access_scope(draft_row, p_access_slug);

  if exists (
    select 1
    from jsonb_array_elements(coalesce(draft_row.signatures, '[]'::jsonb)) as item
    where item ->> 'kind' = p_signature ->> 'kind'
      and item ->> 'signerId' = p_signature ->> 'signerId'
  ) then
    return public.serialize_aa_transaction_draft(draft_row, access_scope, p_access_slug);
  end if;

  next_signatures := coalesce(draft_row.signatures, '[]'::jsonb) || jsonb_build_array(p_signature);

  update public.aa_transaction_drafts
  set signatures = next_signatures
  where draft_id = draft_row.draft_id
  returning * into draft_row;

  return public.serialize_aa_transaction_draft(draft_row, access_scope, p_access_slug);
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

create or replace function public.set_aa_draft_status(p_share_slug text, p_access_slug text, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
begin
  draft_row := public.require_aa_draft_operator_access(p_share_slug, p_access_slug);

  update public.aa_transaction_drafts
  set status = p_status
  where draft_id = draft_row.draft_id
  returning * into draft_row;

  return public.serialize_aa_transaction_draft(draft_row, 'operate', p_access_slug);
end;
$$;

create or replace function public.set_aa_draft_relay_preflight(p_share_slug text, p_access_slug text, p_relay_preflight jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
begin
  draft_row := public.require_aa_draft_operator_access(p_share_slug, p_access_slug);

  update public.aa_transaction_drafts
  set metadata = coalesce(draft_row.metadata, '{}'::jsonb) || jsonb_build_object('relayPreflight', coalesce(p_relay_preflight, 'null'::jsonb))
  where draft_id = draft_row.draft_id
  returning * into draft_row;

  return public.serialize_aa_transaction_draft(draft_row, 'operate', p_access_slug);
end;
$$;

create or replace function public.append_aa_draft_submission_receipt(p_share_slug text, p_access_slug text, p_receipt jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
  next_receipts jsonb;
begin
  draft_row := public.require_aa_draft_operator_access(p_share_slug, p_access_slug);

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

  return public.serialize_aa_transaction_draft(draft_row, 'operate', p_access_slug);
end;
$$;

create or replace function public.rotate_aa_draft_collaboration_slug(p_share_slug text, p_access_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
  next_collaboration_slug text;
begin
  draft_row := public.require_aa_draft_operator_access(p_share_slug, p_access_slug);

  next_collaboration_slug := encode(gen_random_bytes(16), 'hex');
  while next_collaboration_slug = draft_row.share_slug or next_collaboration_slug = draft_row.collaboration_slug or next_collaboration_slug = draft_row.operator_slug loop
    next_collaboration_slug := encode(gen_random_bytes(16), 'hex');
  end loop;

  update public.aa_transaction_drafts
  set collaboration_slug = next_collaboration_slug
  where draft_id = draft_row.draft_id
  returning * into draft_row;

  return public.serialize_aa_transaction_draft(draft_row, 'operate', p_access_slug);
end;
$$;

create function public.rotate_aa_draft_operator_slug(p_share_slug text, p_access_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
  next_operator_slug text;
begin
  draft_row := public.require_aa_draft_operator_access(p_share_slug, p_access_slug);

  next_operator_slug := encode(gen_random_bytes(16), 'hex');
  while next_operator_slug = draft_row.share_slug or next_operator_slug = draft_row.collaboration_slug or next_operator_slug = draft_row.operator_slug loop
    next_operator_slug := encode(gen_random_bytes(16), 'hex');
  end loop;

  update public.aa_transaction_drafts
  set operator_slug = next_operator_slug
  where draft_id = draft_row.draft_id
  returning * into draft_row;

  return public.serialize_aa_transaction_draft(draft_row, 'operate', next_operator_slug);
end;
$$;

grant execute on function public.create_aa_draft(jsonb) to anon;
grant execute on function public.get_aa_draft_by_share_slug(text, text) to anon;
grant execute on function public.append_aa_draft_signature(text, text, jsonb) to anon;
grant execute on function public.append_aa_draft_activity(text, text, jsonb) to anon;
grant execute on function public.set_aa_draft_status(text, text, text) to anon;
grant execute on function public.set_aa_draft_relay_preflight(text, text, jsonb) to anon;
grant execute on function public.append_aa_draft_submission_receipt(text, text, jsonb) to anon;
grant execute on function public.rotate_aa_draft_collaboration_slug(text, text) to anon;
grant execute on function public.rotate_aa_draft_operator_slug(text, text) to anon;
