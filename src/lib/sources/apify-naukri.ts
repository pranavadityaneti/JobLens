// src/lib/sources/apify-naukri.ts
// Naukri ingestion via the Apify actor `muhammetakkurtt/naukri-job-scraper`.
//
// Actor URL form: `muhammetakkurtt~naukri-job-scraper` (Apify uses `~` not `/`).
// Input shape verified on 2026-06-04: { keyword, location, maxItems }.
// Output items expose: jobId, title, companyName, location, jobDescription
// (HTML), jdURL, createdDate, salaryDetail.{minimumSalary,maximumSalary,
// currency,hideSalary}, experience, tagsAndSkills.
import type { FetchResult, ParsedJob } from './types'
import { isIndianRelevant } from './companies'

const ACTOR_ID = 'muhammetakkurtt~naukri-job-scraper'

type NaukriSalaryDetail = {
  minimumSalary?: number
  maximumSalary?: number
  currency?: string
  hideSalary?: boolean
}

type NaukriRaw = {
  jobId?: string | number
  title?: string
  companyName?: string
  location?: string
  jobDescription?: string
  jdURL?: string
  createdDate?: string
  salaryDetail?: NaukriSalaryDetail
  experience?: string
  tagsAndSkills?: string
  [k: string]: unknown
}

/**
 * Best-effort ISO timestamp parser. Naukri returns `createdDate` in
 * "YYYY-MM-DD HH:MM:SS" form (no tz) — treat as UTC. Falls back to now() on
 * parse failure.
 */
function parseNaukriDate(s: string | undefined): string {
  if (!s) return new Date().toISOString()
  // Replace space with T so Date.parse handles it consistently.
  const isoish = s.includes('T') ? s : s.replace(' ', 'T') + 'Z'
  const t = Date.parse(isoish)
  if (Number.isNaN(t)) return new Date().toISOString()
  return new Date(t).toISOString()
}

function parseNaukriJob(raw: NaukriRaw): ParsedJob | null {
  const sourceId = raw.jobId != null ? String(raw.jobId) : ''
  const title = (raw.title ?? '').trim()
  const company = (raw.companyName ?? '').trim()
  const location = (raw.location ?? '').trim()
  const description = raw.jobDescription ?? ''
  const applyUrl = (raw.jdURL ?? '').trim()
  if (!sourceId || !title || !company || !applyUrl) return null

  const sd = raw.salaryDetail
  const hide = sd?.hideSalary === true
  const minSal = !hide && typeof sd?.minimumSalary === 'number' && sd.minimumSalary > 0
    ? sd.minimumSalary
    : null
  const maxSal = !hide && typeof sd?.maximumSalary === 'number' && sd.maximumSalary > 0
    ? sd.maximumSalary
    : null
  const currency = minSal !== null || maxSal !== null ? (sd?.currency ?? 'INR') : null

  return {
    source: 'naukri',
    source_id: sourceId,
    title,
    company,
    location,
    description,
    apply_url: applyUrl,
    salary_min: minSal,
    salary_max: maxSal,
    salary_currency: currency,
    category: null,
    contract_type: null,
    contract_time: null,
    posted_at: parseNaukriDate(raw.createdDate),
  }
}

export type NaukriSearch = { keyword: string; location?: string; maxItems?: number }

export async function fetchNaukriJobs(search: NaukriSearch): Promise<FetchResult> {
  const token = process.env.APIFY_API_TOKEN
  const errors: string[] = []
  if (!token) {
    errors.push('APIFY_API_TOKEN missing')
    return { source: 'naukri', jobs: [], errors }
  }
  const url = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${token}&timeout=180`
  const input = {
    keyword: search.keyword,
    location: search.location ?? 'India',
    maxItems: search.maxItems ?? 50,
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      errors.push(`Naukri ${ACTOR_ID}: ${res.status} ${body.slice(0, 200)}`)
      return { source: 'naukri', jobs: [], errors }
    }
    const items = (await res.json()) as NaukriRaw[]
    const jobs = items
      .map(parseNaukriJob)
      .filter((j): j is ParsedJob => j !== null && isIndianRelevant(j.location))
    return { source: 'naukri', jobs, errors }
  } catch (e) {
    errors.push(`Naukri ${ACTOR_ID}: ${e instanceof Error ? e.message : String(e)}`)
    return { source: 'naukri', jobs: [], errors }
  }
}
