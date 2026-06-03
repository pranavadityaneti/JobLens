// src/app/(app)/page.tsx
import { getSupabaseServer } from '@/lib/supabase/server'
import { JobCard, type JobCardData } from '@/components/jobs/job-card'
import { IngestButton } from '@/components/jobs/ingest-button'

export default async function JobsPage() {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('jobs')
    .select(
      'id, source, source_id, title, company, location, salary_min, salary_max, salary_currency, category, contract_type, posted_at, apply_url',
    )
    .order('posted_at', { ascending: false })
    .limit(50)

  const jobs = (data ?? []) as JobCardData[]

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8 flex items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Jobs</h1>
          <p className="mt-2 text-zinc-500">
            {jobs.length > 0
              ? `Showing ${jobs.length} most recent job${jobs.length === 1 ? '' : 's'}.`
              : 'No jobs ingested yet.'}
          </p>
        </div>
        <IngestButton />
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load jobs: {error.message}
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h2 className="text-base font-semibold text-zinc-900">No jobs yet</h2>
          <p className="mt-1.5 text-sm text-zinc-500">
            Click <span className="font-medium text-zinc-700">Fetch latest from Adzuna</span> in the top-right to pull
            the first batch.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => (
            // userState wiring lands in Session 5 Batch 3 (per-job state lookup).
            <JobCard key={job.id} job={job} userState={null} />
          ))}
        </div>
      )}
    </div>
  )
}
