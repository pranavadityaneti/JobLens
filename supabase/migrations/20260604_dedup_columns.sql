-- JobLens — cross-source dedup columns
-- Adds dedup_hash + canonical_id (self-FK) and backfills both for existing
-- jobs. After this runs, the feed query filters WHERE canonical_id IS NULL
-- and a card shows a "Posted on multiple platforms" badge when other rows
-- have canonical_id pointing at it.
-- Run in Supabase SQL Editor.

-- pgcrypto provides digest(). Supabase enables it by default but be safe.
create extension if not exists pgcrypto;

alter table public.jobs
  add column if not exists dedup_hash text,
  add column if not exists canonical_id uuid references public.jobs(id) on delete set null;

create index if not exists jobs_dedup_hash_idx on public.jobs(dedup_hash);
create index if not exists jobs_canonical_id_idx on public.jobs(canonical_id);

-- Normalize helper for backfill (mirrors src/lib/dedup.ts).
-- Lowercases, strips all non-alphanumerics, collapses to compact form.
create or replace function public.normalize_dedup_field(s text) returns text
language sql immutable as $$
  select lower(regexp_replace(coalesce(s, ''), '[^a-zA-Z0-9]+', '', 'g'))
$$;

-- Compute dedup_hash for every existing row.
update public.jobs
set dedup_hash = encode(
  digest(
    public.normalize_dedup_field(company) || '|' ||
    public.normalize_dedup_field(title) || '|' ||
    public.normalize_dedup_field(location),
    'sha256'
  ),
  'hex'
)
where dedup_hash is null;

-- Link duplicates to first-seen canonical (oldest ingested_at per hash).
with first_seen as (
  select distinct on (dedup_hash)
    dedup_hash, id
  from public.jobs
  where dedup_hash is not null
  order by dedup_hash, ingested_at asc
)
update public.jobs j
set canonical_id = fs.id
from first_seen fs
where j.dedup_hash = fs.dedup_hash
  and j.id <> fs.id
  and j.canonical_id is null;
