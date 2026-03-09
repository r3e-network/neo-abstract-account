create extension if not exists pgcrypto;

create table if not exists public.aa_transaction_drafts (
  draft_id uuid primary key default gen_random_uuid(),
  share_slug text not null unique,
  status text not null default 'draft' check (status in ('draft', 'broadcasted', 'relayed', 'completed', 'cancelled')),
  account jsonb not null default '{}'::jsonb,
  operation_body jsonb,
  transaction_body jsonb,
  signer_requirements jsonb not null default '[]'::jsonb,
  signatures jsonb not null default '[]'::jsonb,
  broadcast_mode text not null default 'client' check (broadcast_mode in ('client', 'relay')),
  metadata jsonb not null default '{}'::jsonb,
  share_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aa_transaction_drafts_share_slug_idx
  on public.aa_transaction_drafts (share_slug);

alter table public.aa_transaction_drafts enable row level security;

create or replace function public.touch_aa_transaction_drafts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists aa_transaction_drafts_updated_at on public.aa_transaction_drafts;
create trigger aa_transaction_drafts_updated_at
before update on public.aa_transaction_drafts
for each row
execute function public.touch_aa_transaction_drafts_updated_at();

create or replace function public.create_aa_draft(p_payload jsonb)
returns public.aa_transaction_drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
  next_draft_id uuid;
  next_share_slug text;
begin
  begin
    next_draft_id := nullif(p_payload ->> 'draft_id', '')::uuid;
  exception
    when others then
      next_draft_id := gen_random_uuid();
  end;

  next_share_slug := coalesce(nullif(p_payload ->> 'share_slug', ''), encode(gen_random_bytes(16), 'hex'));

  insert into public.aa_transaction_drafts (
    draft_id,
    share_slug,
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

  return draft_row;
end;
$$;

create or replace function public.get_aa_draft_by_share_slug(p_share_slug text)
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
  limit 1;

  if not found then
    raise exception 'draft_not_found';
  end if;

  return draft_row;
end;
$$;

create or replace function public.append_aa_draft_signature(p_share_slug text, p_signature jsonb)
returns public.aa_transaction_drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
  next_signatures jsonb;
begin
  select * into draft_row
  from public.aa_transaction_drafts
  where share_slug = p_share_slug
  limit 1;

  if not found then
    raise exception 'draft_not_found';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(draft_row.signatures, '[]'::jsonb)) as item
    where item ->> 'kind' = p_signature ->> 'kind'
      and item ->> 'signerId' = p_signature ->> 'signerId'
  ) then
    return draft_row;
  end if;

  next_signatures := coalesce(draft_row.signatures, '[]'::jsonb) || jsonb_build_array(p_signature);

  update public.aa_transaction_drafts
  set signatures = next_signatures
  where draft_id = draft_row.draft_id
  returning * into draft_row;

  return draft_row;
end;
$$;

create or replace function public.set_aa_draft_status(p_share_slug text, p_status text)
returns public.aa_transaction_drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
begin
  update public.aa_transaction_drafts
  set status = p_status
  where share_slug = p_share_slug
  returning * into draft_row;

  if not found then
    raise exception 'draft_not_found';
  end if;

  return draft_row;
end;
$$;

create or replace function public.patch_aa_draft_metadata(p_share_slug text, p_metadata_patch jsonb)
returns public.aa_transaction_drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
begin
  update public.aa_transaction_drafts
  set metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_metadata_patch, '{}'::jsonb)
  where share_slug = p_share_slug
  returning * into draft_row;

  if not found then
    raise exception 'draft_not_found';
  end if;

  return draft_row;
end;
$$;

create or replace function public.append_aa_draft_activity(p_share_slug text, p_event jsonb)
returns public.aa_transaction_drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row public.aa_transaction_drafts;
  next_activity jsonb;
begin
  select * into draft_row
  from public.aa_transaction_drafts
  where share_slug = p_share_slug
  limit 1;

  if not found then
    raise exception 'draft_not_found';
  end if;

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

  return draft_row;
end;
$$;

grant execute on function public.create_aa_draft(jsonb) to anon;
grant execute on function public.get_aa_draft_by_share_slug(text) to anon;
grant execute on function public.append_aa_draft_signature(text, jsonb) to anon;
grant execute on function public.set_aa_draft_status(text, text) to anon;
grant execute on function public.patch_aa_draft_metadata(text, jsonb) to anon;
grant execute on function public.append_aa_draft_activity(text, jsonb) to anon;
