-- Draft metadata hardening migration
-- Addresses: remaining TOCTOU races in the draft metadata writers (FIX 3 in
--            20260327_security_hardening.sql only covered
--            append_aa_draft_signature), unbounded anon create_aa_draft
--            payloads, anon execute on the internal activity-scope helper,
--            and replay parity for the conditional performance indexes.

-- =============================================================================
-- FIX 1: Re-select FOR UPDATE in the three remaining metadata writers
-- =============================================================================
-- append_aa_draft_activity, set_aa_draft_relay_preflight and
-- append_aa_draft_submission_receipt still read an unlocked snapshot into
-- draft_row and then write the whole merged metadata object back, so two
-- concurrent callers clobber each other's keys (a relay-preflight write can
-- erase a concurrently appended activity entry and vice versa). Apply the same
-- FOR UPDATE re-select used by append_aa_draft_signature in
-- 20260327_security_hardening.sql.

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

  -- Re-select with FOR UPDATE to prevent lost updates on metadata
  select * into draft_row
  from public.aa_transaction_drafts
  where draft_id = draft_row.draft_id
  for update;

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

  -- Re-select with FOR UPDATE to prevent lost updates on metadata
  select * into draft_row
  from public.aa_transaction_drafts
  where draft_id = draft_row.draft_id
  for update;

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

  -- Re-select with FOR UPDATE to prevent lost updates on metadata
  select * into draft_row
  from public.aa_transaction_drafts
  where draft_id = draft_row.draft_id
  for update;

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

-- =============================================================================
-- FIX 2: Bound anon create_aa_draft payloads
-- =============================================================================
-- create_aa_draft is security definer, granted to anon, and previously stored
-- the client payload verbatim: a single anonymous call could persist megabytes
-- per row and bypass the activity/receipt trimming the append RPCs enforce.
-- Reject oversized payloads and non-array signer/signature inputs, cap the
-- arrays, and trim inbound metadata activity/receipts to the same bounds the
-- append RPCs apply (latest 100 activity entries, latest 12 receipts).

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
  next_signer_requirements jsonb;
  next_signatures jsonb;
  next_metadata jsonb;
begin
  if pg_column_size(p_payload) > 65536 then
    raise exception 'draft_payload_too_large';
  end if;

  next_signer_requirements := coalesce(p_payload -> 'signer_requirements', '[]'::jsonb);
  if jsonb_typeof(next_signer_requirements) = 'null' then
    next_signer_requirements := '[]'::jsonb;
  end if;
  if jsonb_typeof(next_signer_requirements) <> 'array' or jsonb_array_length(next_signer_requirements) > 100 then
    raise exception 'draft_signer_requirements_invalid';
  end if;

  next_signatures := coalesce(p_payload -> 'signatures', '[]'::jsonb);
  if jsonb_typeof(next_signatures) = 'null' then
    next_signatures := '[]'::jsonb;
  end if;
  if jsonb_typeof(next_signatures) <> 'array' or jsonb_array_length(next_signatures) > 100 then
    raise exception 'draft_signatures_invalid';
  end if;

  next_metadata := coalesce(p_payload -> 'metadata', '{}'::jsonb);
  if jsonb_typeof(next_metadata) = 'null' then
    next_metadata := '{}'::jsonb;
  end if;
  if jsonb_typeof(next_metadata) <> 'object' then
    raise exception 'draft_metadata_invalid';
  end if;

  if jsonb_typeof(next_metadata -> 'activity') = 'array' then
    next_metadata := next_metadata || jsonb_build_object('activity', (
      select coalesce(jsonb_agg(value order by ord), '[]'::jsonb)
      from (
        select value, ord
        from jsonb_array_elements(next_metadata -> 'activity') with ordinality as item(value, ord)
        order by ord desc
        limit 100
      ) trimmed
    ));
  elsif next_metadata ? 'activity' then
    next_metadata := next_metadata - 'activity';
  end if;

  if jsonb_typeof(next_metadata -> 'submissionReceipts') = 'array' then
    next_metadata := next_metadata || jsonb_build_object('submissionReceipts', (
      select coalesce(jsonb_agg(value order by ord), '[]'::jsonb)
      from (
        select value, ord
        from jsonb_array_elements(next_metadata -> 'submissionReceipts') with ordinality as item(value, ord)
        order by ord desc
        limit 12
      ) trimmed
    ));
  elsif next_metadata ? 'submissionReceipts' then
    next_metadata := next_metadata - 'submissionReceipts';
  end if;

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
    next_signer_requirements,
    next_signatures,
    coalesce(nullif(p_payload ->> 'broadcast_mode', ''), 'client'),
    next_metadata,
    coalesce(nullif(p_payload ->> 'share_path', ''), '/tx/' || next_share_slug)
  )
  returning * into draft_row;

  return public.serialize_aa_transaction_draft(draft_row, 'operate', draft_row.operator_slug);
end;
$$;

-- =============================================================================
-- FIX 3: Revoke anon execute on the internal activity-scope helper
-- =============================================================================
-- assert_aa_draft_activity_allowed is only invoked from inside
-- append_aa_draft_activity (security definer, runs as the function owner) and
-- was needlessly granted to anon by 20260313_activity_scope_guards.sql. Revoke
-- from public as well, since the default public execute grant would otherwise
-- keep the function reachable by anon regardless of the direct revoke.

revoke execute on function public.assert_aa_draft_activity_allowed(text, jsonb) from public, anon, authenticated;

-- =============================================================================
-- FIX 4: Replay parity for the conditional performance indexes
-- =============================================================================
-- 20260309_add_performance_indexes.sql predates the operator_slug and
-- collaboration_slug columns in filename order, so it creates those two
-- indexes only when the columns already exist. Re-create them idempotently
-- here so a fresh filename-order replay converges on the same end state as
-- databases that applied the chain incrementally.

create index if not exists idx_aa_drafts_operator_slug
  on public.aa_transaction_drafts(operator_slug)
  where operator_slug is not null;

create index if not exists idx_aa_drafts_collaboration_slug
  on public.aa_transaction_drafts(collaboration_slug)
  where collaboration_slug is not null;
