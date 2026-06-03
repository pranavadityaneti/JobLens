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
  CONTRACT_TYPE_GROUPS,
  INDUSTRY_GROUPS,
  INDUSTRY_OPTIONS,
  LOCATION_GROUPS,
  dateCutoffIso,
  parseFilters,
  type SortKey,
} from '@/lib/job-filters'
import {
  extractExperienceBucket,
  extractWorkModel,
} from '@/lib/job-text'

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
    // Each selected label expands to its alias patterns; OR-match the union.
    const patterns = filters.locations.flatMap((l) => LOCATION_GROUPS[l] ?? [l])
    const orStr = patterns.map((p) => `location.ilike.%${p}%`).join(',')
    query = query.or(orStr)
  }
  if (filters.industries.length) {
    // Expand each canonical industry into its raw-value list, then ILIKE-OR
    // so partial matches (e.g. "SW Eng - Applications-674" → Engineering)
    // are caught. We skip "Other" here in MVP — querying "everything NOT in
    // any known group" is hard to express cleanly in PostgREST.
    const expanded = filters.industries.flatMap((i) => INDUSTRY_GROUPS[i] ?? [])
    if (expanded.length > 0) {
      const orStr = expanded.map((v) => `category.ilike.%${v}%`).join(',')
      query = query.or(orStr)
    }
  }
  if (filters.contractTypes.length) {
    // Canonical labels map to many raw `contract_type` values; flatten + IN.
    const values = filters.contractTypes.flatMap(
      (c) => CONTRACT_TYPE_GROUPS[c] ?? [c],
    )
    query = query.in('contract_type', values)
  }
  // Salary filters: keep NULL-salary jobs visible since the vast majority
  // of jobs don't disclose salary. Each .or() becomes its own AND-combined
  // OR group, so the combined predicate is:
  //   (salary_max IS NULL OR salary_max >= smin)
  //   AND (salary_min IS NULL OR salary_min <= smax)
  if (filters.salaryMin != null) {
    query = query.or(`salary_max.is.null,salary_max.gte.${filters.salaryMin}`)
  }
  if (filters.salaryMax != null) {
    query = query.or(`salary_min.is.null,salary_min.lte.${filters.salaryMax}`)
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

  // Industry options are a fixed canonical taxonomy — no dynamic sampling.
  // See INDUSTRY_GROUPS in @/lib/job-filters for the raw→canonical mapping.

  return (
    <JobsDashboard
      filters={filters}
      jobs={jobs}
      flagsRecord={flagsRecord}
      industryOptions={INDUSTRY_OPTIONS}
      error={error?.message ?? null}
    />
  )
}
