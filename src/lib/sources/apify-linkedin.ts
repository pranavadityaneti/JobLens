// src/lib/sources/apify-linkedin.ts
// LinkedIn ingestion via the Apify actor `curious_coder/linkedin-jobs-scraper`.
//
// Actor URL form: `curious_coder~linkedin-jobs-scraper` (Apify uses `~` not `/`).
// Input shape verified on 2026-06-04: { urls: string[], count: number }.
// The actor expects LinkedIn `jobs/search` URLs; we synthesize one from the
// (keyword, location) pair. `count` must be >= 10.
//
// Output items expose: id, title, companyName, location, descriptionHtml,
// descriptionText, link, postedAt (YYYY-MM-DD), employmentType, jobFunction,
// industries, salary, seniorityLevel.
import type { FetchResult, ParsedJob } from './types'
import { isIndianRelevant } from './companies'

const ACTOR_ID = 'curious_coder~linkedin-jobs-scraper'

type LinkedinRaw = {
  id?: string | number
  title?: string
  companyName?: string
  location?: string
  descriptionHtml?: string
  descriptionText?: string
  link?: string
  applyUrl?: string
  postedAt?: string
  employmentType?: string
  jobFunction?: string
  industries?: string
  salary?: string
  seniorityLevel?: string
  [k: string]: unknown
}

function parseLinkedinDate(s: string | undefined): string {
  if (!s) return new Date().toISOString()
  // postedAt is "YYYY-MM-DD". Date.parse handles that as UTC midnight.
  const t = Date.parse(s)
  if (Number.isNaN(t)) return new Date().toISOString()
  return new Date(t).toISOString()
}

function parseLinkedinJob(raw: LinkedinRaw): ParsedJob | null {
  const sourceId = raw.id != null ? String(raw.id) : ''
  const title = (raw.title ?? '').trim()
  const company = (raw.companyName ?? '').trim()
  const location = (raw.location ?? '').trim()
  const description = (raw.descriptionHtml ?? raw.descriptionText ?? '').trim()
  // Prefer the public link to the job posting; fall back to applyUrl.
  const applyUrl = (raw.link ?? raw.applyUrl ?? '').trim()
  if (!sourceId || !title || !company || !applyUrl) return null

  return {
    source: 'linkedin',
    source_id: sourceId,
    title,
    company,
    location,
    description,
    apply_url: applyUrl,
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    category: raw.jobFunction?.trim() || null,
    contract_type: null,
    // employmentType is "Full-time", "Part-time", "Contract", etc. — closer
    // to contract_time than contract_type semantically (Adzuna's split is
    // "full_time"/"part_time" for contract_time vs "permanent"/"contract"
    // for contract_type).
    contract_time:
      raw.employmentType ? normalizeContractTime(raw.employmentType) : null,
    posted_at: parseLinkedinDate(raw.postedAt),
  }
}

function normalizeContractTime(s: string): string | null {
  const v = s.toLowerCase()
  if (v.includes('full')) return 'full_time'
  if (v.includes('part')) return 'part_time'
  if (v.includes('contract')) return 'contract'
  if (v.includes('intern')) return 'internship'
  return null
}

function buildSearchUrl(keyword: string, location: string): string {
  const params = new URLSearchParams({ keywords: keyword, location })
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`
}

export type LinkedinSearch = {
  keyword: string
  location?: string
  /** Number of jobs to fetch — actor requires >= 10. Default 50. */
  count?: number
}

export async function fetchLinkedinJobs(
  search: LinkedinSearch,
): Promise<FetchResult> {
  const token = process.env.APIFY_API_TOKEN
  const errors: string[] = []
  if (!token) {
    errors.push('APIFY_API_TOKEN missing')
    return { source: 'linkedin', jobs: [], errors }
  }
  const url = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${token}&timeout=240`
  const location = search.location ?? 'India'
  const count = Math.max(10, search.count ?? 50)
  const input = {
    urls: [buildSearchUrl(search.keyword, location)],
    count,
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      errors.push(`LinkedIn ${ACTOR_ID}: ${res.status} ${body.slice(0, 200)}`)
      return { source: 'linkedin', jobs: [], errors }
    }
    const items = (await res.json()) as LinkedinRaw[]
    const jobs = items
      .map(parseLinkedinJob)
      .filter((j): j is ParsedJob => j !== null && isIndianRelevant(j.location))
    return { source: 'linkedin', jobs, errors }
  } catch (e) {
    errors.push(`LinkedIn ${ACTOR_ID}: ${e instanceof Error ? e.message : String(e)}`)
    return { source: 'linkedin', jobs: [], errors }
  }
}
