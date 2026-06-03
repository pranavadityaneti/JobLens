// src/components/jobs/job-detail.tsx
import { Building2, Briefcase, Clock, MapPin, Wallet, Sparkles } from 'lucide-react'
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

/**
 * Best-effort extraction of experience requirement (e.g. "3-5 years") from
 * the job title and description. Returns null if no clear signal.
 */
function extractExperience(title: string, description: string): string | null {
  const text = `${title} ${description}`
  // Match "3-5 years", "3 to 5 years", "5+ years", "minimum 3 years", "5 years exp"
  const range = text.match(/(\d{1,2})\s*[-–to]+\s*(\d{1,2})\s*(?:\+)?\s*years?/i)
  if (range) return `${range[1]}–${range[2]} years`
  const plus = text.match(/(\d{1,2})\s*\+\s*years?/i)
  if (plus) return `${plus[1]}+ years`
  const min = text.match(/min(?:imum)?\s*(\d{1,2})\s*years?/i)
  if (min) return `${min[1]}+ years`
  const single = text.match(/(\d{1,2})\s*years?\s*(?:of\s*)?(?:experience|exp)/i)
  if (single) return `${single[1]} years`
  return null
}

/**
 * Best-effort detection of work model (Remote / Hybrid / On-site) from the
 * description. Returns null if no clear signal.
 */
function extractWorkModel(description: string): string | null {
  const t = description.toLowerCase()
  if (/\b(fully\s+remote|100%?\s*remote|remote\s*[-–]?\s*anywhere|wfh\s*permanent)\b/.test(t)) return 'Remote'
  if (/\bhybrid\b/.test(t)) return 'Hybrid'
  if (/\b(on[\s-]?site|onsite|in[\s-]?office|office[\s-]?based)\b/.test(t)) return 'On-site'
  if (/\bremote\b/.test(t)) return 'Remote'
  return null
}

/**
 * Bold-highlight common label headers in raw description text.
 * Returns an array of React nodes so we don't have to use
 * dangerouslySetInnerHTML.
 */
const LABEL_PATTERNS = [
  'Total Experience',
  'Experience',
  'Job Type',
  'Job Role',
  'Job Description',
  'Job Summary',
  'Responsibilities',
  'Key Responsibilities',
  'Requirements',
  'Required Skills',
  'Required Qualifications',
  'Qualifications',
  'Skills',
  'Key Skills',
  'Technical Skills',
  'Education',
  'Eligibility',
  'About the Role',
  'About the Company',
  'About Us',
  'About the Job',
  'Benefits',
  'Perks',
  'What You’ll Do',
  'What You Will Do',
  'What We Offer',
  'Location',
  'Salary',
  'Compensation',
  'Roles & Responsibilities',
  'Roles and Responsibilities',
]

function highlightLabels(text: string): React.ReactNode[] {
  const pattern = new RegExp(
    `(?:^|\\n|\\.\\s+)\\s*(${LABEL_PATTERNS.map((p) =>
      p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    ).join('|')})\\s*:`,
    'gi',
  )
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let i = 0
  while ((match = pattern.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index)
    if (before) nodes.push(before)
    // Reconstruct the original leading separator + the label, bolded
    const leading = match[0].slice(0, match[0].toLowerCase().indexOf(match[1].toLowerCase()))
    if (leading) nodes.push(leading)
    nodes.push(
      <strong key={`label-${i++}`} className="font-semibold text-zinc-900">
        {match[1]}:
      </strong>,
    )
    lastIndex = match.index + match[0].length
  }
  const tail = text.slice(lastIndex)
  if (tail) nodes.push(tail)
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
  userState,
}: {
  job: JobDetailData
  userState: UserJobState | null
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

      <div className="flex-1 overflow-y-auto px-2 py-6">
        {/* SECTION 3: About the role */}
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            About the role
          </h3>
          <div className="mt-3 max-w-none whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
            {highlightLabels(job.description)}
          </div>
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
          initialState={userState}
        />
      </div>
    </div>
  )
}
