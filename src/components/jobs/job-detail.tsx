// src/components/jobs/job-detail.tsx
import { Building2, Clock, MapPin } from 'lucide-react'
import type { UserJobState } from '@/lib/user-jobs'
import { CompanyLogo } from './company-logo'
import { JobCardActions } from './job-card-actions'

export type JobDetailData = {
  id: string
  title: string
  company: string
  location: string
  description: string
  apply_url: string
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
  category: string | null
  contract_type: string | null
  contract_time: string | null
  posted_at: string
}

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

export function JobDetail({
  job,
  userState,
}: {
  job: JobDetailData
  userState: UserJobState | null
}) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency)
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start gap-5 px-2 pb-5">
        <CompanyLogo company={job.company} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-950">
            {job.title}
          </h2>
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

      <hr className="border-zinc-200" />

      <div className="flex-1 overflow-y-auto px-2 py-6">
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Description
          </h3>
          <div className="mt-3 max-w-none whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
            {job.description}
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5 text-center text-sm text-zinc-500">
          AI match score and resume tailoring will appear here in Sessions 10 + 11.
        </section>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-zinc-200 bg-white/95 px-2 py-4 backdrop-blur">
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
