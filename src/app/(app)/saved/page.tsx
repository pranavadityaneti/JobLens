// src/app/(app)/saved/page.tsx
import { getJobsByUserFlag, type UserJobFlags } from '@/lib/user-jobs'
import { attachMultiPlatformFlag } from '@/lib/jobs'
import { JobFeed, type FeedJob } from '@/components/jobs/job-feed'

export default async function SavedPage() {
  const jobs = await getJobsByUserFlag('saved')
  // Saved jobs may ALSO be applied — derive the full flag map per job so the
  // Applied badge still renders alongside the saved bookmark.
  const flagsRecord: Record<string, UserJobFlags> = {}
  for (const j of jobs) {
    flagsRecord[j.id] = {
      saved: j.saved_at != null,
      applied: j.applied_at != null,
      hidden: j.hidden_at != null,
    }
  }
  const jobsWithMulti = await attachMultiPlatformFlag(jobs)
  const feedJobs = jobsWithMulti as unknown as FeedJob[]

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Saved jobs</h1>
        <p className="mt-2 text-zinc-500">
          {feedJobs.length > 0
            ? `${feedJobs.length} saved job${feedJobs.length === 1 ? '' : 's'}.`
            : 'Jobs you save will appear here.'}
        </p>
      </header>

      {feedJobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h2 className="text-base font-semibold text-zinc-900">No saved jobs</h2>
          <p className="mt-1.5 text-sm text-zinc-500">
            Click the bookmark icon on any job to save it for later.
          </p>
        </div>
      ) : (
        <JobFeed jobs={feedJobs} flagsMap={flagsRecord} />
      )}
    </div>
  )
}
