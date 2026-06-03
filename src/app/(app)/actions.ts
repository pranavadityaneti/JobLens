// src/app/(app)/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { fetchAdzunaJobs } from '@/lib/adzuna'
import { upsertJobs } from '@/lib/jobs'
import { setJobState, type UserJobState } from '@/lib/user-jobs'

export async function signOut() {
  const supabase = await getSupabaseServer()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function ingestAdzunaJobs(): Promise<
  { ok: true; inserted: number; skipped: number; count: number } | { ok: false; error: string }
> {
  // Auth check: only allow authenticated users to trigger ingestion.
  // (Server-only, so the URL can't be hit from outside without a session cookie.)
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  try {
    const { count, jobs } = await fetchAdzunaJobs({ page: 1, resultsPerPage: 50 })
    const { inserted, skipped } = await upsertJobs(jobs)
    return { ok: true, inserted, skipped, count }
  } catch (err) {
    console.error('ingestAdzunaJobs failed', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Set or clear the current user's state for a given job.
 * `state = null` removes any existing relationship.
 *
 * Revalidates the paths whose contents change with this state:
 * /, /saved, /applied.
 */
export async function setUserJobState(
  jobId: string,
  state: UserJobState | null,
): Promise<{ ok: true; state: UserJobState | null } | { ok: false; error: string }> {
  const result = await setJobState(jobId, state)
  if (result.ok) {
    revalidatePath('/')
    revalidatePath('/saved')
    revalidatePath('/applied')
    revalidatePath(`/jobs/${jobId}`)
  }
  return result
}
