// src/app/(app)/jobs/[id]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Building2, Clock, MapPin } from 'lucide-react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getUserStatesForJobs } from '@/lib/user-jobs'
import { JobCardActions } from '@/components/jobs/job-card-actions'

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (min == null && max == null) return null
  const sym = currency === 'INR' ? '₹' : currency ? `${currency} ` : ''
  const fmt = (n: number) =>
    n >= 100000
      ? `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
      : n.toLocaleString('en-IN')
  if (min != null && max != null) return `${sym}${fmt(min)} – ${sym}${fmt(max)}`
  if (min != null) return `${sym}${fmt(min)}+`
  return `up to ${sym}${fmt(max!)}`
}

function formatPostedAt(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days < 1) {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    return hours < 1 ? 'just now' : `${hours}h ago`
  }
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function companyInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

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
      'id, title, company, location, description, apply_url, salary_min, salary_max, salary_currency, category, contract_type, contract_time, posted_at',
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !job) notFound()

  const stateMap = await getUserStatesForJobs([job.id])
  const userState = stateMap.get(job.id) ?? null

  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency)

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to jobs
      </Link>

      <article className="mt-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <header className="flex items-start gap-5">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <span className="text-2xl font-semibold">{companyInitial(job.company)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">{job.title}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-base text-zinc-700">
              <Building2 className="h-4 w-4 text-zinc-400" />
              {job.company}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-zinc-500">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatPostedAt(job.posted_at)}
              </span>
              {salary && <span className="font-semibold text-emerald-700">{salary}</span>}
            </div>
            {(job.category || job.contract_type || job.contract_time) && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {job.category && (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600">
                    {job.category}
                  </span>
                )}
                {job.contract_type && (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs capitalize text-zinc-600">
                    {job.contract_type}
                  </span>
                )}
                {job.contract_time && (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs capitalize text-zinc-600">
                    {job.contract_time.replace('_', ' ')}
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        <hr className="my-6 border-zinc-200" />

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Description
          </h2>
          <div className="prose prose-zinc mt-3 max-w-none whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
            {job.description}
          </div>
        </section>

        {/* AI features placeholder — Sessions 10 + 11 */}
        <section className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5 text-center text-sm text-zinc-500">
          AI match score and resume tailoring will appear here in Sessions 10 + 11.
        </section>
      </article>

      {/* Sticky action bar */}
      <div className="sticky bottom-4 mt-6 flex items-center justify-end gap-3 rounded-2xl border border-zinc-200 bg-white/95 px-5 py-3 shadow-md backdrop-blur">
        <JobCardActions
          jobId={job.id}
          jobTitle={job.title}
          company={job.company}
          applyUrl={job.apply_url}
          initialState={userState}
        />
      </div>
    </div>
  )
}
