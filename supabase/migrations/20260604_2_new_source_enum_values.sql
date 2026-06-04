-- JobLens — add Workday / SmartRecruiters / BambooHR / Workable to the
-- jobs.source enum. Postgres requires alter type to add enum values
-- outside a transaction; Supabase SQL Editor handles this fine.

alter type public.job_source add value if not exists 'workday';
alter type public.job_source add value if not exists 'smartrecruiters';
alter type public.job_source add value if not exists 'bamboohr';
alter type public.job_source add value if not exists 'workable';
