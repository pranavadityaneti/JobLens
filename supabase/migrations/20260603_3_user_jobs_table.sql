-- JobLens — user_jobs table (Session 5)
-- Per-user state for jobs: saved | applied | hidden. Mutually exclusive.
-- Run in Supabase SQL Editor.

create type public.user_job_state as enum (
  'saved',
  'applied',
  'hidden'
);

create table public.user_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  state public.user_job_state not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create index user_jobs_user_state_idx on public.user_jobs (user_id, state);
create index user_jobs_job_id_idx on public.user_jobs (job_id);

alter table public.user_jobs enable row level security;

-- Users can read / write only their own rows.
create policy "user_jobs_select_own"
  on public.user_jobs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_jobs_insert_own"
  on public.user_jobs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_jobs_update_own"
  on public.user_jobs for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_jobs_delete_own"
  on public.user_jobs for delete
  to authenticated
  using (auth.uid() = user_id);

-- updated_at trigger (reuses set_updated_at from the init migration)
create trigger user_jobs_set_updated_at
  before update on public.user_jobs
  for each row execute function public.set_updated_at();
