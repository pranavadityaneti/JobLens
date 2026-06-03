// src/lib/user-jobs.ts
// Per-user job-flag repository. Three independent boolean flags
// (saved/applied/hidden) — a job can be in multiple states simultaneously.

import { getSupabaseServer } from '@/lib/supabase/server'

export type UserJobFlag = 'saved' | 'applied' | 'hidden'

export type UserJobFlags = {
  saved: boolean
  applied: boolean
  hidden: boolean
}

export const NO_FLAGS: UserJobFlags = { saved: false, applied: false, hidden: false }

export type JobWithFlags = {
  id: string
  source: string
  source_id: string
  title: string
  company: string
  location: string
  description: string
  apply_url: string
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
  category: string | null
  contract_type: string | null
  contract_time: string | null
  posted_at: string
  saved_at: string | null
  applied_at: string | null
  hidden_at: string | null
}

const COLUMN_FOR_FLAG: Record<UserJobFlag, 'saved_at' | 'applied_at' | 'hidden_at'> = {
  saved: 'saved_at',
  applied: 'applied_at',
  hidden: 'hidden_at',
}

/**
 * Set or clear a single flag for the current user on a job. Other flags on
 * the same row are preserved. Inserts a row if none exists.
 */
export async function setUserJobFlag(
  jobId: string,
  flag: UserJobFlag,
  value: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const column = COLUMN_FOR_FLAG[flag]
  const now = new Date().toISOString()

  const { error } = await supabase.from('user_jobs').upsert(
    {
      user_id: user.id,
      job_id: jobId,
      [column]: value ? now : null,
    },
    { onConflict: 'user_id,job_id' },
  )
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Get jobs the current user has a given flag set on, newest first.
 * Joins `jobs` so callers can render full cards.
 */
export async function getJobsByUserFlag(flag: UserJobFlag): Promise<JobWithFlags[]> {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const column = COLUMN_FOR_FLAG[flag]

  const { data } = await supabase
    .from('user_jobs')
    .select(
      `
      saved_at, applied_at, hidden_at,
      jobs (
        id, source, source_id, title, company, location, description, apply_url,
        salary_min, salary_max, salary_currency, category, contract_type,
        contract_time, posted_at
      )
    `,
    )
    .eq('user_id', user.id)
    .not(column, 'is', null)
    .order(column, { ascending: false })

  if (!data) return []

  return data
    .filter((row) => row.jobs != null)
    .map((row) => {
      const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs
      return {
        ...(job as Omit<JobWithFlags, 'saved_at' | 'applied_at' | 'hidden_at'>),
        saved_at: row.saved_at as string | null,
        applied_at: row.applied_at as string | null,
        hidden_at: row.hidden_at as string | null,
      }
    })
}

/**
 * Returns the set of job_ids for the current user where ANY of the given
 * flags is set. Used by the main feed to exclude applied + hidden jobs.
 */
export async function getUserJobIdsWithAnyFlag(
  flags: UserJobFlag[],
): Promise<Set<string>> {
  if (flags.length === 0) return new Set()
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Set()

  const orFilter = flags.map((f) => `${COLUMN_FOR_FLAG[f]}.not.is.null`).join(',')

  const { data } = await supabase
    .from('user_jobs')
    .select('job_id')
    .eq('user_id', user.id)
    .or(orFilter)

  return new Set((data ?? []).map((r) => r.job_id as string))
}

/**
 * Map of flags for a list of jobIds for the current user. Used by feed
 * pages to render correct icons.
 */
export async function getUserFlagsForJobs(
  jobIds: string[],
): Promise<Map<string, UserJobFlags>> {
  if (jobIds.length === 0) return new Map()
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Map()

  const { data } = await supabase
    .from('user_jobs')
    .select('job_id, saved_at, applied_at, hidden_at')
    .eq('user_id', user.id)
    .in('job_id', jobIds)

  const m = new Map<string, UserJobFlags>()
  for (const row of data ?? []) {
    m.set(row.job_id as string, {
      saved: row.saved_at != null,
      applied: row.applied_at != null,
      hidden: row.hidden_at != null,
    })
  }
  return m
}
