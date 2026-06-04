// src/components/jobs/job-detail.tsx
import { Building2, Briefcase, Clock, MapPin, Wallet, Sparkles } from 'lucide-react'
import DOMPurify from 'isomorphic-dompurify'
import type { UserJobFlags } from '@/lib/user-jobs'
import { extractExperience, extractWorkModel } from '@/lib/job-text'
import { CompanyLogo } from './company-logo'
import { JobCardActions } from './job-card-actions'

/**
 * Heuristic for "does this description contain HTML markup?". ATS sources
 * (Greenhouse, Lever, Ashby) return HTML; Adzuna returns plain text.
 */
function looksLikeHtml(s: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(s)
}

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
  multi_platform?: boolean
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

/**
 * Heuristic detection of "this short line is a sub-heading inside a job
 * description". We can't rely on a fixed list of labels — different job
 * boards/companies write the same idea with infinite variation
 * ("Who we are" / "About Stripe" / "About the team" — none of which match
 * a closed pattern list, and few of them end with a colon).
 *
 * Rules (intersection):
 *   - non-empty, ≤ 60 chars, ≤ 8 words
 *   - starts with a capital letter
 *   - has no sentence-grade punctuation (. , ; ? !) — except a trailing colon
 *   - not a bullet or numbered list marker
 *   - followed by a non-empty content line
 *
 * These are conservative enough that real prose lines (which always have
 * commas/periods or are long) won't get false-positived.
 */
function isLikelyHeading(line: string, nextLine: string | undefined): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (trimmed.length > 60) return false
  const words = trimmed.split(/\s+/)
  if (words.length > 8) return false
  if (!/^[A-Z]/.test(trimmed)) return false
  // Strip a trailing colon before the punctuation check — colons are OK on
  // headings, other sentence punctuation is not.
  const checkable = trimmed.replace(/:$/, '')
  if (/[.;?!,]/.test(checkable)) return false
  if (/^\d+[.)]/.test(checkable)) return false // numbered list
  if (/^[•\-*]/.test(checkable)) return false // bullet
  if (!nextLine || !nextLine.trim()) return false
  return true
}

/**
 * Walk the description line by line. Treat heading-shaped lines as block
 * <strong> elements with `mt-6` (except the first) so sub-sections are
 * visibly separated; accumulate everything else into preserved text
 * segments. Whitespace around heading transitions is trimmed so content
 * sits flush under its heading.
 */
function highlightLabels(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let segments: string[] = []
  let labelIdx = 0

  const flushSegments = () => {
    if (segments.length === 0) return
    // Strip leading and trailing blank lines around content blocks so the
    // heading→content and content→next-heading transitions look tight.
    const joined = segments.join('\n').replace(/^\s+|\s+$/g, '')
    if (joined) nodes.push(joined)
    segments = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const next = lines[i + 1]
    if (isLikelyHeading(line, next)) {
      flushSegments()
      const headingText = line.trim().replace(/:$/, '')
      nodes.push(
        <strong
          key={`label-${labelIdx}`}
          className={`${labelIdx === 0 ? '' : 'mt-6 '}block font-semibold text-zinc-900`}
        >
          {headingText}
        </strong>,
      )
      labelIdx++
    } else {
      segments.push(line)
    }
  }
  flushSegments()
  return nodes
}

function QuickFact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-zinc-50 p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-sm font-semibold text-zinc-950">{value}</div>
    </div>
  )
}

export function JobDetail({
  job,
  flags,
}: {
  job: JobDetailData
  flags: UserJobFlags
}) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency)
  const experience = extractExperience(job.title, job.description)
  const workModel = extractWorkModel(job.description)
  const jobType = job.contract_type
    ? job.contract_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null

  return (
    <div className="flex h-full flex-col">
      {/* SECTION 1: Header */}
      <header className="flex items-start gap-5 px-2 pb-5">
        <CompanyLogo company={job.company} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-950">
              {job.title}
            </h2>
            {job.multi_platform && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700"
                title="Posted on multiple platforms"
              >
                Multi-platform
              </span>
            )}
          </div>
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
          </div>
        </div>
      </header>

      <hr className="border-zinc-200" />

      {/* SECTION 2: Quick facts */}
      <section className="grid grid-cols-2 gap-3 py-5 sm:grid-cols-4">
        <QuickFact icon={Wallet} label="Salary" value={salary ?? 'Not disclosed'} />
        <QuickFact icon={Briefcase} label="Experience" value={experience ?? 'Not specified'} />
        <QuickFact icon={Briefcase} label="Job Type" value={jobType ?? 'Not specified'} />
        <QuickFact icon={MapPin} label="Work Model" value={workModel ?? 'Not specified'} />
      </section>

      <hr className="border-zinc-200" />

      <div className="flex-1 overflow-y-auto px-2 pb-6">
        {/* SECTION 3: About the role */}
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            About the role
          </h3>
          {looksLikeHtml(job.description) ? (
            <div
              className="prose prose-sm prose-zinc mt-3 max-w-none text-zinc-700 [&_a]:text-emerald-700 [&_li]:my-0.5 [&_h1]:mt-8 [&_h1]:font-semibold [&_h1]:text-zinc-900 [&_h2]:mt-8 [&_h2]:font-semibold [&_h2]:text-zinc-900 [&_h3]:mt-8 [&_h3]:font-semibold [&_h3]:text-zinc-900 [&_h4]:mt-6 [&_h4]:font-semibold [&_h4]:text-zinc-900 [&_h5]:mt-6 [&_h5]:font-semibold [&_h5]:text-zinc-900 [&_h6]:mt-6 [&_h6]:font-semibold [&_h6]:text-zinc-900 [&_p]:mt-3 [&_ul]:mt-3 [&_ol]:mt-3 [&_*:first-child]:mt-0"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(job.description, {
                  ALLOWED_TAGS: [
                    'p', 'br', 'ul', 'ol', 'li',
                    'strong', 'em', 'b', 'i', 'u',
                    'a',
                    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                    'blockquote', 'code', 'pre',
                    'div', 'span',
                  ],
                  ALLOWED_ATTR: ['href', 'target', 'rel'],
                }),
              }}
            />
          ) : (
            <div className="mt-3 max-w-none whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
              {highlightLabels(job.description)}
            </div>
          )}
        </section>

        <hr className="my-6 border-zinc-200" />

        {/* SECTION 4: Tags / taxonomy */}
        {(job.category || job.contract_type || job.contract_time) && (
          <>
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Details
              </h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {job.category && (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700">
                    {job.category}
                  </span>
                )}
                {job.contract_type && (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs capitalize text-zinc-700">
                    {job.contract_type.replace(/_/g, ' ')}
                  </span>
                )}
                {job.contract_time && (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs capitalize text-zinc-700">
                    {job.contract_time.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </section>
            <hr className="my-6 border-zinc-200" />
          </>
        )}

        {/* SECTION 5: AI Insights (placeholder until Sessions 9-11) */}
        <section>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            <Sparkles className="h-3.5 w-3.5" />
            AI Insights
          </h3>
          <div className="mt-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5 text-center text-sm text-zinc-500">
            Your match score and tailored resume suggestions will appear here once you upload your resume.
          </div>
        </section>
      </div>

      {/* SECTION 6: Sticky action bar */}
      <div className="flex items-center justify-end gap-3 border-t border-zinc-200 bg-white/95 px-2 py-4 backdrop-blur">
        <JobCardActions
          jobId={job.id}
          jobTitle={job.title}
          company={job.company}
          applyUrl={job.apply_url}
          initialFlags={flags}
        />
      </div>
    </div>
  )
}
