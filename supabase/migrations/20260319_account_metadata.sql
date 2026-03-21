-- Per-account description & logo metadata (off-chain supplement to on-chain MetadataUri)
create table if not exists aa_account_metadata (
  account_id_hash text primary key,
  description text not null default '',
  logo_url text not null default '',
  metadata_uri text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table aa_account_metadata enable row level security;

-- Public read access for market display
create policy "Public read aa_account_metadata"
  on aa_account_metadata for select
  using (true);

-- Service-role write access (used by serverless API)
create policy "Service role insert aa_account_metadata"
  on aa_account_metadata for insert
  with check (true);

create policy "Service role update aa_account_metadata"
  on aa_account_metadata for update
  using (true);
