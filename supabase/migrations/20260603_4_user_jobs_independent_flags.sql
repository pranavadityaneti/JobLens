-- JobLens — user_jobs independent flags (Session 5+)
-- Replaces mutually-exclusive `state` enum with three independent timestamp
-- columns: saved_at, applied_at, hidden_at. A job can now be both saved AND
-- applied for the same user, so saved entries are preserved when applied.
-- Run in Supabase SQL Editor.

-- Drop the existing state-based composite index
drop index if exists public.user_jobs_user_state_idx;

-- Add the three independent timestamp columns
alter table public.user_jobs
  add column if not exists saved_at timestamptz,
  add column if not exists applied_at timestamptz,
  add column if not exists hidden_at timestamptz;

-- Backfill from the existing state column
update public.user_jobs set saved_at = updated_at where state = 'saved';
update public.user_jobs set applied_at = updated_at where state = 'applied';
update public.user_jobs set hidden_at = updated_at where state = 'hidden';

-- Drop the legacy state column and its enum type
alter table public.user_jobs drop column if exists state;
drop type if exists public.user_job_state;

-- Partial indices for efficient state filtering
create index if not exists user_jobs_saved_idx
  on public.user_jobs (user_id, saved_at desc)
  where saved_at is not null;

create index if not exists user_jobs_applied_idx
  on public.user_jobs (user_id, applied_at desc)
  where applied_at is not null;

create index if not exists user_jobs_hidden_idx
  on public.user_jobs (user_id, hidden_at desc)
  where hidden_at is not null;
