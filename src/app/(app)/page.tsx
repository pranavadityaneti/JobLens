// src/app/(app)/page.tsx
import { getSupabaseServer } from '@/lib/supabase/server'
import {
  getUserJobIdsWithAnyFlag,
  getUserFlagsForJobs,
  type UserJobFlags,
} from '@/lib/user-jobs'
import { JobFeed, type FeedJob } from '@/components/jobs/job-feed'

const PAGE_LIMIT = 50

export default async function JobsPage() {
  const supabase = await getSupabaseServer()
  // Hide jobs the user has already applied to or hidden. Saved jobs DO
  // appear in the main feed so the user can still unsave or apply.
  const excludedJobIds = await getUserJobIdsWithAnyFlag(['applied', 'hidden'])

  let query = supabase
    .from('jobs')
    .select(
      'id, source, source_id, title, company, location, description, apply_url, salary_min, salary_max, salary_currency, category, contract_type, contract_time, posted_at',
    )
    .order('posted_at', { ascending: false })
    .limit(PAGE_LIMIT)

  if (excludedJobIds.size > 0) {
    const list = Array.from(excludedJobIds).join(',')
    query = query.not('id', 'in', `(${list})`)
  }

  const { data, error } = await query
  const jobs = (data ?? []) as FeedJob[]

  // Plain object map (client-serializable)
  const flagsMap = await getUserFlagsForJobs(jobs.map((j) => j.id))
  const flagsRecord: Record<string, UserJobFlags> = {}
  for (const [k, v] of flagsMap) flagsRecord[k] = v

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Jobs</h1>
        <p className="mt-2 text-zinc-500">
          {jobs.length > 0
            ? `Showing ${jobs.length} most recent job${jobs.length === 1 ? '' : 's'}.`
            : 'No jobs available right now.'}
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load jobs: {error.message}
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h2 className="text-base font-semibold text-zinc-900">No jobs to show</h2>
          <p className="mt-1.5 text-sm text-zinc-500">
            New jobs will appear here as they&apos;re ingested.
          </p>
        </div>
      ) : (
        <JobFeed jobs={jobs} flagsMap={flagsRecord} />
      )}
    </div>
  )
}
