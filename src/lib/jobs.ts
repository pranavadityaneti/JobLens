// src/lib/jobs.ts
// Job repository — DB writes through the admin client (bypasses RLS).
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { ParsedJob } from './adzuna'

export async function upsertJobs(jobs: ParsedJob[]): Promise<{
  inserted: number
  skipped: number
}> {
  if (jobs.length === 0) return { inserted: 0, skipped: 0 }

  const supabase = getSupabaseAdmin()
  // Insert with on-conflict-do-nothing on (source, source_id). Supabase JS uses
  // `upsert` with `ignoreDuplicates: true` to express this.
  const { data, error } = await supabase
    .from('jobs')
    .upsert(jobs, { onConflict: 'source,source_id', ignoreDuplicates: true })
    .select('id')

  if (error) throw new Error(`upsertJobs failed: ${error.message}`)

  const inserted = data?.length ?? 0
  return { inserted, skipped: jobs.length - inserted }
}
