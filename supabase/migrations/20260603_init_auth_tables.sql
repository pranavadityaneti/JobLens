-- JobLens — initial auth tables
-- Creates: profiles (extends auth.users), otp_requests (transient OTP storage)
-- Run in Supabase SQL Editor.

-- ============================================================
-- profiles: per-user data linked to auth.users
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  daily_tailoring_count int not null default 0,
  daily_tailoring_reset_at timestamptz not null default now()
);

create index profiles_phone_idx on public.profiles(phone);

alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Server-side admin inserts only (no client insert policy = blocked)

-- ============================================================
-- otp_requests: short-lived OTP records
-- ============================================================
create table public.otp_requests (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create index otp_requests_phone_idx on public.otp_requests(phone);
create index otp_requests_expires_at_idx on public.otp_requests(expires_at);

alter table public.otp_requests enable row level security;
-- No policies = no client access; only service_role can read/write.

-- ============================================================
-- Trigger: keep profiles.updated_at fresh
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
