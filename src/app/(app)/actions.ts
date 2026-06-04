// src/app/(app)/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { fetchAdzunaJobs } from '@/lib/sources/adzuna'
import { fetchGreenhouseJobs } from '@/lib/sources/greenhouse'
import { fetchLeverJobs } from '@/lib/sources/lever'
import { fetchAshbyJobs } from '@/lib/sources/ashby'
import { fetchNaukriJobs } from '@/lib/sources/apify-naukri'
import { fetchLinkedinJobs } from '@/lib/sources/apify-linkedin'
import { fetchWorkdayJobs } from '@/lib/sources/workday'
import { fetchSmartRecruitersJobs } from '@/lib/sources/smartrecruiters'
import { fetchBambooHRJobs } from '@/lib/sources/bamboohr'
import { fetchWorkableJobs } from '@/lib/sources/workable'
import {
  GREENHOUSE_BOARDS,
  LEVER_SLUGS,
  ASHBY_SLUGS,
  APIFY_SEARCH_QUERIES,
  WORKDAY_TENANTS,
  SMARTRECRUITERS_SLUGS,
  BAMBOOHR_SUBDOMAINS,
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
  // Tokens vary per ATS: string slugs for Greenhouse/Lever/Ashby/SmartRecruiters/
  // BambooHR; structured { tenant, site, wdHost } objects for Workday.
  // Workable doesn't fit this fan-out pattern (no per-account API) — it runs
  // separately below as a single firehose query.
  async function runAts<T>(
    name: string,
    tokens: readonly T[],
    fetcher: (t: T) => Promise<{ jobs: ParsedJob[]; errors: string[] }>,
  ) {
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

  await runAts('greenhouse', GREENHOUSE_BOARDS, fetchGreenhouseJobs)
  await runAts('lever', LEVER_SLUGS, fetchLeverJobs)
  await runAts('ashby', ASHBY_SLUGS, fetchAshbyJobs)
  await runAts('workday', WORKDAY_TENANTS, fetchWorkdayJobs)
  await runAts('smartrecruiters', SMARTRECRUITERS_SLUGS, fetchSmartRecruitersJobs)
  await runAts('bamboohr', BAMBOOHR_SUBDOMAINS, fetchBambooHRJobs)

  // Workable — single firehose query (see note above). Sequenced after the
  // ATS fan-out to keep timing predictable.
  try {
    const r = await fetchWorkableJobs({ location: 'India', limit: 100 })
    let inserted = 0
    let skipped = 0
    if (r.jobs.length > 0) {
      const u = await upsertJobs(r.jobs)
      inserted = u.inserted
      skipped = u.skipped
    }
    bySource.workable = { inserted, skipped, errors: r.errors }
    totalInserted += inserted
    totalSkipped += skipped
  } catch (err) {
    bySource.workable = {
      inserted: 0,
      skipped: 0,
      errors: [err instanceof Error ? err.message : String(err)],
    }
  }

  // Apify sources — Naukri + LinkedIn. Each runs every curated search query
  // in parallel; results are deduped by upsert on (source, source_id).
  // Sequential across sources to keep concurrent Apify spend bounded.
  const apifySources = [
    ['naukri', fetchNaukriJobs],
    ['linkedin', fetchLinkedinJobs],
  ] as const

  for (const [name, fetcher] of apifySources) {
    let inserted = 0
    let skipped = 0
    const errors: string[] = []
    const results = await Promise.all(APIFY_SEARCH_QUERIES.map((q) => fetcher(q)))
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
