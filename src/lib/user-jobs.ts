// src/lib/user-jobs.ts
// Per-user job-state repository.
// Used by server actions; reads/writes go through the cookie-aware server
// client so RLS enforces ownership.

import { getSupabaseServer } from '@/lib/supabase/server'

export type UserJobState = 'saved' | 'applied' | 'hidden'

export type JobWithState = {
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
  state: UserJobState
  state_updated_at: string
}

/**
 * Upsert (or clear) the state for one (user, job) pair.
 * Pass `state = null` to remove any existing relationship.
 * Returns the new state, or null if cleared.
 */
export async function setJobState(
  jobId: string,
  state: UserJobState | null,
): Promise<{ ok: true; state: UserJobState | null } | { ok: false; error: string }> {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  if (state === null) {
    const { error } = await supabase
      .from('user_jobs')
      .delete()
      .match({ user_id: user.id, job_id: jobId })
    if (error) return { ok: false, error: error.message }
    return { ok: true, state: null }
  }

  const { error } = await supabase.from('user_jobs').upsert(
    {
      user_id: user.id,
      job_id: jobId,
      state,
    },
    { onConflict: 'user_id,job_id' },
  )
  if (error) return { ok: false, error: error.message }
  return { ok: true, state }
}

/**
 * Get the current user's jobs filtered by a single state, newest first.
 * Joins `jobs` so the caller can render full job cards.
 */
export async function getJobsByUserState(state: UserJobState): Promise<JobWithState[]> {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('user_jobs')
    .select(
      `
      state,
      updated_at,
      jobs (
        id, source, source_id, title, company, location, description, apply_url,
        salary_min, salary_max, salary_currency, category, contract_type,
        contract_time, posted_at
      )
    `,
    )
    .eq('user_id', user.id)
    .eq('state', state)
    .order('updated_at', { ascending: false })

  if (error || !data) return []

  return data
    .filter((row) => row.jobs != null)
    // The Supabase JS type for an embedded join is sometimes inferred as
    // a single object, sometimes as an array; coerce defensively.
    .map((row) => {
      const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs
      return {
        ...(job as Omit<JobWithState, 'state' | 'state_updated_at'>),
        state: row.state as UserJobState,
        state_updated_at: row.updated_at as string,
      }
    })
}

/**
 * For the current user, return a Set of job_ids whose state is in the given
 * filter. Used by feed pages to "exclude applied + hidden" cheaply.
 */
export async function getUserJobIdsByStates(
  states: UserJobState[],
): Promise<Set<string>> {
  if (states.length === 0) return new Set()
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Set()

  const { data } = await supabase
    .from('user_jobs')
    .select('job_id')
    .eq('user_id', user.id)
    .in('state', states)

  return new Set((data ?? []).map((r) => r.job_id as string))
}

/**
 * Map of all user_job state for a list of jobIds. Used by the main feed to
 * render the correct icon (saved/hidden/applied) on each card.
 */
export async function getUserStatesForJobs(
  jobIds: string[],
): Promise<Map<string, UserJobState>> {
  if (jobIds.length === 0) return new Map()
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Map()

  const { data } = await supabase
    .from('user_jobs')
    .select('job_id, state')
    .eq('user_id', user.id)
    .in('job_id', jobIds)

  return new Map(
    (data ?? []).map((r) => [r.job_id as string, r.state as UserJobState]),
  )
}
