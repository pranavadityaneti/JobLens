-- JobLens — jobs table (Session 4)
-- Minimal schema: dedup_hash, canonical_id, embedding deferred to later sessions.
-- Run in Supabase SQL Editor.

create type public.job_source as enum (
  'adzuna',
  'greenhouse',
  'lever',
  'ashby',
  'naukri',
  'linkedin',
  'indeed'
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  source public.job_source not null,
  source_id text not null,
  title text not null,
  company text not null,
  location text not null,
  description text not null,
  apply_url text not null,
  salary_min numeric,
  salary_max numeric,
  salary_currency text,
  category text,
  contract_type text,
  contract_time text,
  posted_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  unique (source, source_id)
);

create index jobs_posted_at_idx on public.jobs (posted_at desc);
create index jobs_source_idx on public.jobs (source);

alter table public.jobs enable row level security;

-- Any authenticated user can read all jobs (public catalog)
create policy "jobs_select_authenticated"
  on public.jobs for select
  to authenticated
  using (true);

-- No insert/update/delete policies = only service_role can mutate.
