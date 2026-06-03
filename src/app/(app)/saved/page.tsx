// src/app/(app)/saved/page.tsx
import { getJobsByUserState, type UserJobState } from '@/lib/user-jobs'
import { JobFeed, type FeedJob } from '@/components/jobs/job-feed'

export default async function SavedPage() {
  const jobs = (await getJobsByUserState('saved')) as unknown as FeedJob[]
  const stateRecord: Record<string, UserJobState> = {}
  for (const j of jobs) stateRecord[j.id] = 'saved'

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Saved jobs</h1>
        <p className="mt-2 text-zinc-500">
          {jobs.length > 0
            ? `${jobs.length} saved job${jobs.length === 1 ? '' : 's'}.`
            : 'Jobs you save will appear here.'}
        </p>
      </header>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h2 className="text-base font-semibold text-zinc-900">No saved jobs</h2>
          <p className="mt-1.5 text-sm text-zinc-500">
            Click the bookmark icon on any job to save it for later.
          </p>
        </div>
      ) : (
        <JobFeed jobs={jobs} stateMap={stateRecord} />
      )}
    </div>
  )
}
