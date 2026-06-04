// src/lib/sources/bamboohr.ts
// BambooHR public Careers API client.
//
// Endpoint:
//   GET https://{subdomain}.bamboohr.com/careers/list?format=json
//
// Notes:
//   - Many BambooHR tenants sit behind Cloudflare with strict bot rules.
//     Requests need a browser-like User-Agent to get past the edge. Even with
//     that, some tenants 403 from server-side IPs; we soft-fail (errors[]) and
//     log so the curated list can be pruned.
//   - The list response carries metadata only — no descriptions. Like Workday,
//     we use the title as a placeholder.
//   - Each posting's apply URL is `https://{subdomain}.bamboohr.com/careers/{id}`.

import type { FetchResult, ParsedJob } from './types'
import { isIndianRelevant } from './companies'

type BambooLocation = { city?: string | null; state?: string | null } | null

type BambooAtsLocation = {
  country?: string | null
  state?: string | null
  province?: string | null
  city?: string | null
} | null

type BambooPosting = {
  id: number | string
  jobOpeningName: string
  departmentLabel?: string | null
  employmentStatusLabel?: string | null
  location?: BambooLocation
  atsLocation?: BambooAtsLocation
  isRemote?: boolean | null
  jobOpeningStatus?: string
  datePosted?: string | null
  jobOpeningShareUrl?: string | null
}

type BambooResponse = {
  meta?: { totalCount?: number }
  result?: BambooPosting[]
}

function formatLocation(p: BambooPosting): string {
  if (p.isRemote) return 'Remote'
  const ats = p.atsLocation
  if (ats) {
    const parts = [ats.city, ats.state ?? ats.province, ats.country].filter(Boolean)
    if (parts.length) return parts.join(', ')
  }
  const loc = p.location
  if (loc) {
    const parts = [loc.city, loc.state].filter(Boolean)
    if (parts.length) return parts.join(', ')
  }
  return 'Unknown'
}

export async function fetchBambooHRJobs(subdomain: string): Promise<FetchResult> {
  const url = `https://${subdomain}.bamboohr.com/careers/list?format=json`
  const errors: string[] = []
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        // Cloudflare-protected BambooHR tenants 403 the bare fetch User-Agent.
        // A standard browser UA gets us past the WAF in most cases.
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    })
    if (!res.ok) {
      errors.push(`BambooHR ${subdomain}: ${res.status} ${res.statusText}`)
      return { source: 'bamboohr', jobs: [], errors }
    }
    const data = (await res.json()) as BambooResponse
    const jobs: ParsedJob[] = (data.result ?? [])
      .filter((p) => p.jobOpeningStatus === undefined || p.jobOpeningStatus === 'Open')
      .filter((p) => isIndianRelevant(formatLocation(p)))
      .map((p) => ({
        source: 'bamboohr',
        source_id: `${subdomain}:${p.id}`,
        title: p.jobOpeningName,
        company: subdomain,
        location: formatLocation(p),
        description: p.jobOpeningName,
        apply_url:
          p.jobOpeningShareUrl ??
          `https://${subdomain}.bamboohr.com/careers/${p.id}`,
        salary_min: null,
        salary_max: null,
        salary_currency: null,
        category: p.departmentLabel ?? null,
        contract_type: p.employmentStatusLabel ?? null,
        contract_time: p.isRemote ? 'Remote' : null,
        posted_at: p.datePosted ?? new Date().toISOString(),
      }))
    return { source: 'bamboohr', jobs, errors }
  } catch (err) {
    errors.push(
      `BambooHR ${subdomain}: ${err instanceof Error ? err.message : String(err)}`,
    )
    return { source: 'bamboohr', jobs: [], errors }
  }
}
