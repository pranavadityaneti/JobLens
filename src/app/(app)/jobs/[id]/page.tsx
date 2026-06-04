// src/app/(app)/jobs/[id]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getUserFlagsForJobs, NO_FLAGS } from '@/lib/user-jobs'
import { attachMultiPlatformFlag } from '@/lib/jobs'
import { JobDetail, type JobDetailData } from '@/components/jobs/job-detail'

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await getSupabaseServer()

  const { data: job, error } = await supabase
    .from('jobs')
    .select(
      'id, title, company, location, description, apply_url, salary_min, salary_max, salary_currency, category, contract_type, contract_time, posted_at, dedup_hash, canonical_id',
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !job) notFound()

  const flagsMap = await getUserFlagsForJobs([job.id])
  const flags = flagsMap.get(job.id) ?? NO_FLAGS
  const [jobWithMulti] = await attachMultiPlatformFlag([job as JobDetailData])

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to jobs
      </Link>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <JobDetail job={jobWithMulti} flags={flags} />
      </div>
    </div>
  )
}
