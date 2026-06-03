// src/app/(app)/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { fetchAdzunaJobs } from '@/lib/sources/adzuna'
import { fetchGreenhouseJobs } from '@/lib/sources/greenhouse'
import { fetchLeverJobs } from '@/lib/sources/lever'
import { fetchAshbyJobs } from '@/lib/sources/ashby'
import {
  GREENHOUSE_BOARDS,
  LEVER_SLUGS,
  ASHBY_SLUGS,
} from '@/lib/sources/companies'
import type { ParsedJob } from '@/lib/sources/types'
import { upsertJobs } from '@/lib/jobs'
import { setUserJobFlag, type UserJobFlag } from '@/lib/user-jobs'

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

type SourceTally = { inserted: number; skipped: number; errors: string[] }

type IngestAllResult =
  | {
      ok: true
      bySource: Record<string, SourceTally>
      totalInserted: number
      totalSkipped: number
    }
  | { ok: false; error: string }

/**
 * Fans out across every job source (Adzuna + ATS providers) and upserts
 * everything into the `jobs` table. Adzuna runs first, then each ATS runs
 * its companies in parallel; ATSes are sequenced to keep the load polite.
 *
 * Auth-gated: only authenticated users may trigger ingestion.
 */
export async function ingestAllSources(): Promise<IngestAllResult> {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const bySource: Record<string, SourceTally> = {}
  let totalInserted = 0
  let totalSkipped = 0

  // Adzuna first
  try {
    const { jobs } = await fetchAdzunaJobs({ page: 1, resultsPerPage: 50 })
    const { inserted, skipped } = await upsertJobs(jobs)
    bySource.adzuna = { inserted, skipped, errors: [] }
    totalInserted += inserted
    totalSkipped += skipped
  } catch (err) {
    bySource.adzuna = {
      inserted: 0,
      skipped: 0,
      errors: [err instanceof Error ? err.message : String(err)],
    }
  }

  // ATS sources — fan out across companies in parallel WITHIN each ATS,
  // sequential ACROSS ATSes to keep the load polite.
  const atsSources = [
    ['greenhouse', GREENHOUSE_BOARDS, fetchGreenhouseJobs],
    ['lever', LEVER_SLUGS, fetchLeverJobs],
    ['ashby', ASHBY_SLUGS, fetchAshbyJobs],
  ] as const

  for (const [name, tokens, fetcher] of atsSources) {
    let inserted = 0
    let skipped = 0
    const errors: string[] = []
    const results = await Promise.all(tokens.map((t) => fetcher(t)))
    const allJobs: ParsedJob[] = results.flatMap((r) => r.jobs)
    for (const r of results) errors.push(...r.errors)
    if (allJobs.length > 0) {
      try {
        const r = await upsertJobs(allJobs)
        inserted += r.inserted
        skipped += r.skipped
      } catch (err) {
        errors.push(`upsert: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    bySource[name] = { inserted, skipped, errors }
    totalInserted += inserted
    totalSkipped += skipped
  }

  return { ok: true, bySource, totalInserted, totalSkipped }
}

/**
 * Set or clear a single flag (saved | applied | hidden) on a job for the
 * current user. Other flags on the same row are preserved.
 *
 * Revalidates the paths whose contents may change: /, /saved, /applied,
 * and the job detail page.
 */
export async function setUserJobFlagAction(
  jobId: string,
  flag: UserJobFlag,
  value: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await setUserJobFlag(jobId, flag, value)
  if (result.ok) {
    revalidatePath('/')
    revalidatePath('/saved')
    revalidatePath('/applied')
    revalidatePath(`/jobs/${jobId}`)
  }
  return result
}
