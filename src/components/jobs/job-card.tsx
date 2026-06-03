// src/components/jobs/job-card.tsx
import { Building2, MapPin, Clock } from 'lucide-react'

export type JobCardData = {
  id: string
  title: string
  company: string
  location: string
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
  category: string | null
  contract_type: string | null
  posted_at: string // ISO
  apply_url: string
  source: string
}

function formatSalary(min: number | null, max: number | null, currency: string | null): string | null {
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

export function JobCard({ job }: { job: JobCardData }) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency)
  return (
    <article className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
        <span className="text-lg font-semibold">{companyInitial(job.company)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-zinc-950">{job.title}</h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-zinc-600">
              <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" />
              {job.company}
            </p>
          </div>
          <a
            href={job.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-600"
          >
            Apply
          </a>
        </header>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {job.location}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatPostedAt(job.posted_at)}
          </span>
          {salary && (
            <span className="font-medium text-emerald-700">{salary}</span>
          )}
        </div>
        {(job.category || job.contract_type) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.category && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                {job.category}
              </span>
            )}
            {job.contract_type && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 capitalize">
                {job.contract_type}
              </span>
            )}
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-emerald-700">
              {job.source}
            </span>
          </div>
        )}
      </div>
    </article>
  )
}
