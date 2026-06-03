// src/app/(app)/page.tsx
import { getSupabaseServer } from '@/lib/supabase/server'
import {
  getUserFlagsForJobs,
  getUserJobIdsWithAnyFlag,
  type UserJobFlags,
} from '@/lib/user-jobs'
import {
  JobsDashboard,
  type DashboardJob,
} from '@/components/jobs/jobs-dashboard'
import {
  dateCutoffIso,
  parseFilters,
  type SortKey,
} from '@/lib/job-filters'
import {
  extractExperienceBucket,
  extractWorkModel,
} from '@/lib/job-text'

// How many recent jobs to inspect when building the dynamic industry list.
const INDUSTRY_SAMPLE_SIZE = 500
const INDUSTRY_MAX_OPTIONS = 20

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams

  // Re-encode the Next searchParams object into a URLSearchParams so the
  // same parsing path works as on the client.
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue
    if (Array.isArray(v)) v.forEach((x) => usp.append(k, x))
    else usp.append(k, v)
  }
  const filters = parseFilters(usp)

  const supabase = await getSupabaseServer()
  // Hide jobs the user has already applied to or hidden. Saved jobs DO
  // still appear in the main feed.
  const excludedJobIds = await getUserJobIdsWithAnyFlag(['applied', 'hidden'])

  let query = supabase
    .from('jobs')
    .select(
      'id, source, source_id, title, company, location, description, apply_url, salary_min, salary_max, salary_currency, category, contract_type, contract_time, posted_at',
    )

  // ----- Server-side filters -----
  if (filters.q) {
    query = query.or(
      `title.ilike.%${filters.q}%,description.ilike.%${filters.q}%`,
    )
  }
  if (filters.locations.length) {
    const orStr = filters.locations
      .map((l) => `location.ilike.%${l}%`)
      .join(',')
    query = query.or(orStr)
  }
  if (filters.industries.length) {
    query = query.in('category', filters.industries)
  }
  if (filters.contractTypes.length) {
    query = query.in('contract_type', filters.contractTypes)
  }
  if (filters.salaryMin != null) {
    query = query.gte('salary_max', filters.salaryMin)
  }
  if (filters.salaryMax != null) {
    query = query.lte('salary_min', filters.salaryMax)
  }
  const cutoff = dateCutoffIso(filters.date)
  if (cutoff) query = query.gte('posted_at', cutoff)

  if (filters.skills.length) {
    const orStr = filters.skills
      .flatMap((s) => [`title.ilike.%${s}%`, `description.ilike.%${s}%`])
      .join(',')
    query = query.or(orStr)
  }

  if (excludedJobIds.size > 0) {
    query = query.not('id', 'in', `(${Array.from(excludedJobIds).join(',')})`)
  }

  // ----- Sorting -----
  const sortMap: Record<SortKey, { col: string; asc: boolean }> = {
    newest: { col: 'posted_at', asc: false },
    salary_desc: { col: 'salary_max', asc: false },
    salary_asc: { col: 'salary_min', asc: true },
  }
  const s = sortMap[filters.sort]
  query = query
    .order(s.col, { ascending: s.asc, nullsFirst: false })
    .limit(filters.perPage)

  const { data, error } = await query
  let jobs = (data ?? []) as DashboardJob[]

  // ----- Client-side post-filters for derived fields -----
  if (filters.workModels.length > 0) {
    jobs = jobs.filter((j) => {
      const wm = extractWorkModel(j.description)
      return wm != null && filters.workModels.includes(wm)
    })
  }
  if (filters.experience.length > 0) {
    jobs = jobs.filter((j) => {
      const exp = extractExperienceBucket(j.title, j.description)
      return exp != null && filters.experience.includes(exp)
    })
  }

  // Flag map for the cards
  const stateMap = await getUserFlagsForJobs(jobs.map((j) => j.id))
  const flagsRecord: Record<string, UserJobFlags> = {}
  for (const [k, v] of stateMap) flagsRecord[k] = v

  // Compute industry options from a recent sample of jobs, capped to the
  // top N by frequency. Cheap enough for MVP; if dataset grows we'll move
  // this to a materialised view.
  const { data: catData } = await supabase
    .from('jobs')
    .select('category')
    .not('category', 'is', null)
    .order('posted_at', { ascending: false })
    .limit(INDUSTRY_SAMPLE_SIZE)
  const counts: Record<string, number> = {}
  for (const r of catData ?? []) {
    const c = r.category as string | null
    if (!c) continue
    counts[c] = (counts[c] ?? 0) + 1
  }
  const industryOptions = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, INDUSTRY_MAX_OPTIONS)
    .map(([c]) => c)

  return (
    <JobsDashboard
      filters={filters}
      jobs={jobs}
      flagsRecord={flagsRecord}
      industryOptions={industryOptions}
      error={error?.message ?? null}
    />
  )
}
