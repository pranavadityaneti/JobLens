// src/lib/sources/workday.ts
// Workday CXS public Jobs API client.
//
// Endpoint shape:
//   POST https://{tenant}.{wdHost}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
//   Body: { limit, offset, searchText, appliedFacets }
//
// Notes:
//   - Workday is multi-tenant. Each company has its own (tenant, site, wdHost).
//     The wdHost is the wd1..wd103 subdomain Workday assigns to a tenant.
//   - The list endpoint returns rich metadata but NOT the job description.
//     Fetching descriptions requires a second call to `wday/cxs/.../job/<jobId>`.
//     We skip that for now to keep the ingest cycle bounded — the description
//     falls back to the job title.
//   - `postedOn` is human-readable ("Posted 4 Days Ago" / "Posted Yesterday" /
//     "Posted Today" / "Posted 30+ Days Ago"). We parse the common forms; if a
//     value is unparseable we fall back to now().
//   - We use `searchText: "India"` to bias the response toward Indian roles —
//     it's a fuzzy text filter, so we still re-apply isIndianRelevant() to
//     drop anything that slips through.

import type { FetchResult, ParsedJob } from './types'
import { isIndianRelevant } from './companies'

export type WorkdayTenant = {
  tenant: string
  site: string
  wdHost: string // e.g. 'wd1', 'wd3', 'wd5', 'wd12', 'wd103'
}

type WorkdayJobPosting = {
  title: string
  externalPath: string
  locationsText?: string
  postedOn?: string
  bulletFields?: string[]
}

type WorkdayResponse = {
  total?: number
  jobPostings?: WorkdayJobPosting[]
}

/**
 * Best-effort conversion of Workday's "Posted N <unit> Ago" strings into an
 * ISO timestamp. Unrecognised inputs fall back to "now".
 */
function parseWorkdayPostedOn(
  posted: string | undefined,
  now: Date = new Date(),
): string {
  if (!posted) return now.toISOString()
  const s = posted.toLowerCase()
  if (s.includes('today')) return now.toISOString()
  if (s.includes('yesterday')) {
    const d = new Date(now)
    d.setDate(d.getDate() - 1)
    return d.toISOString()
  }
  const match = s.match(/posted\s+(\d+)\+?\s+(day|days|month|months|week|weeks|hour|hours)/)
  if (match) {
    const n = parseInt(match[1], 10)
    const unit = match[2]
    const d = new Date(now)
    if (unit.startsWith('day')) d.setDate(d.getDate() - n)
    else if (unit.startsWith('week')) d.setDate(d.getDate() - n * 7)
    else if (unit.startsWith('month')) d.setMonth(d.getMonth() - n)
    else if (unit.startsWith('hour')) d.setHours(d.getHours() - n)
    return d.toISOString()
  }
  return now.toISOString()
}

/**
 * Extract a stable job ID. Workday surfaces a requisition ID in `bulletFields`,
 * but tenants vary in which slot it lives in (and some surface non-ID strings
 * like location names there). We prefer the trailing `_R12345` segment of
 * `externalPath`, falling back to bulletFields[0], falling back to the whole
 * externalPath. Always namespaced by tenant to avoid collisions across boards.
 */
function extractWorkdaySourceId(
  tenant: string,
  job: WorkdayJobPosting,
): string {
  const path = job.externalPath ?? ''
  const trailing = path.match(/_([A-Z0-9-]+)$/i)
  const candidate = trailing?.[1] ?? job.bulletFields?.[0] ?? path
  return `${tenant}:${candidate}`
}

export async function fetchWorkdayJobs(t: WorkdayTenant): Promise<FetchResult> {
  const url = `https://${t.tenant}.${t.wdHost}.myworkdayjobs.com/wday/cxs/${t.tenant}/${t.site}/jobs`
  const errors: string[] = []
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        limit: 20,
        offset: 0,
        // Biasing toward Indian roles cuts payload by ~10x on big tenants like
        // Accenture / PwC. isIndianRelevant() still runs as the final filter.
        searchText: 'India',
        appliedFacets: {},
      }),
    })
    if (!res.ok) {
      errors.push(
        `Workday ${t.tenant}/${t.site}: ${res.status} ${res.statusText}`,
      )
      return { source: 'workday', jobs: [], errors }
    }
    const data = (await res.json()) as WorkdayResponse
    const now = new Date()
    const jobs: ParsedJob[] = (data.jobPostings ?? [])
      .filter((j) => isIndianRelevant(j.locationsText ?? ''))
      .map((j) => ({
        source: 'workday',
        source_id: extractWorkdaySourceId(t.tenant, j),
        title: j.title,
        company: t.tenant,
        location: j.locationsText ?? 'Unknown',
        // Workday's list response carries no description. Use the title as a
        // placeholder so downstream rendering has something; a future improvement
        // can fetch /wday/cxs/{tenant}/{site}/job/<jobId> for the real body.
        description: j.title,
        apply_url: `https://${t.tenant}.${t.wdHost}.myworkdayjobs.com${j.externalPath}`,
        salary_min: null,
        salary_max: null,
        salary_currency: null,
        category: null,
        contract_type: null,
        contract_time: null,
        posted_at: parseWorkdayPostedOn(j.postedOn, now),
      }))
    return { source: 'workday', jobs, errors }
  } catch (err) {
    errors.push(
      `Workday ${t.tenant}/${t.site}: ${err instanceof Error ? err.message : String(err)}`,
    )
    return { source: 'workday', jobs: [], errors }
  }
}
