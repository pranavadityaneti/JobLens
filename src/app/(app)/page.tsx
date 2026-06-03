// src/app/(app)/page.tsx
import { getSupabaseServer } from '@/lib/supabase/server'
import {
  getUserJobIdsByStates,
  getUserStatesForJobs,
} from '@/lib/user-jobs'
import { JobCard, type JobCardData } from '@/components/jobs/job-card'

const PAGE_LIMIT = 50

export default async function JobsPage() {
  const supabase = await getSupabaseServer()

  // Pull jobs the user has applied to or hidden — we'll filter them out.
  const excludedJobIds = await getUserJobIdsByStates(['applied', 'hidden'])

  // Query: most recent jobs minus the excluded ones. Use .not('id', 'in', ...)
  // when there are excluded ids; otherwise plain query.
  let query = supabase
    .from('jobs')
    .select(
      'id, source, source_id, title, company, location, salary_min, salary_max, salary_currency, category, contract_type, posted_at, apply_url',
    )
    .order('posted_at', { ascending: false })
    .limit(PAGE_LIMIT)

  if (excludedJobIds.size > 0) {
    // Postgres "id NOT IN (uuid_list)" via PostgREST: not.in.(a,b,c)
    const list = Array.from(excludedJobIds).join(',')
    query = query.not('id', 'in', `(${list})`)
  }

  const { data, error } = await query
  const jobs = (data ?? []) as JobCardData[]

  // For remaining jobs, look up whether each is saved by the user (the
  // remaining states are 'saved' or none).
  const stateMap = await getUserStatesForJobs(jobs.map((j) => j.id))

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
        <div className="flex flex-col gap-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              userState={stateMap.get(job.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
