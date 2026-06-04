// src/lib/jobs.ts
// Job repository — DB writes through the admin client (bypasses RLS).
// Computes dedup_hash + canonical_id during upsert so cross-source duplicates
// link to a single canonical row that the feed surfaces.
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { computeDedupHash } from '@/lib/dedup'
import type { ParsedJob } from './sources/types'

type Upsertable = ParsedJob & {
  dedup_hash: string
  canonical_id: string | null
}

export async function upsertJobs(jobs: ParsedJob[]): Promise<{
  inserted: number
  skipped: number
}> {
  if (jobs.length === 0) return { inserted: 0, skipped: 0 }
  const supabase = getSupabaseAdmin()

  // 1. Compute dedup_hash for each incoming job.
  const enriched: Array<ParsedJob & { dedup_hash: string }> = jobs.map((j) => ({
    ...j,
    dedup_hash: computeDedupHash(j.company, j.title, j.location),
  }))

  // 2. Look up existing canonical rows for these hashes (one batched query).
  // We treat the OLDEST row per hash as canonical (matches backfill semantics).
  const hashes = Array.from(new Set(enriched.map((j) => j.dedup_hash)))
  const canonicalByHash = new Map<string, string>()
  if (hashes.length > 0) {
    const { data: existing } = await supabase
      .from('jobs')
      .select('id, dedup_hash, ingested_at, canonical_id')
      .in('dedup_hash', hashes)
      .order('ingested_at', { ascending: true })
    for (const row of existing ?? []) {
      // For each hash, the first row we see (oldest) is the canonical.
      // If that row itself has a canonical_id, follow the pointer.
      if (!canonicalByHash.has(row.dedup_hash as string)) {
        const canonical = (row.canonical_id as string | null) ?? (row.id as string)
        canonicalByHash.set(row.dedup_hash as string, canonical)
      }
    }
  }

  // 3. Assign canonical_id: null if this is the first-ever job with this
  // hash (it becomes canonical); else point at the existing canonical.
  const finalRows: Upsertable[] = enriched.map((j) => ({
    ...j,
    canonical_id: canonicalByHash.get(j.dedup_hash) ?? null,
  }))

  // 4. Upsert with on-conflict-do-nothing on (source, source_id).
  const { data, error } = await supabase
    .from('jobs')
    .upsert(finalRows, { onConflict: 'source,source_id', ignoreDuplicates: true })
    .select('id')

  if (error) throw new Error(`upsertJobs failed: ${error.message}`)
  const inserted = data?.length ?? 0
  return { inserted, skipped: jobs.length - inserted }
}

/**
 * Attach a `multi_platform` boolean to each job — true when at least one
 * duplicate row exists pointing at it (canonical_id = jobId). One batched
 * query; no N+1.
 */
export async function attachMultiPlatformFlag<T extends { id: string }>(
  jobs: T[],
): Promise<Array<T & { multi_platform: boolean }>> {
  if (jobs.length === 0) return []
  const supabase = getSupabaseAdmin()
  const jobIds = jobs.map((j) => j.id)
  const { data } = await supabase
    .from('jobs')
    .select('canonical_id')
    .in('canonical_id', jobIds)
  const multi = new Set(
    (data ?? []).map((r) => r.canonical_id as string).filter(Boolean),
  )
  return jobs.map((j) => ({ ...j, multi_platform: multi.has(j.id) }))
}
