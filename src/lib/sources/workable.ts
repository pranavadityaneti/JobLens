// src/lib/sources/workable.ts
// Workable public Job Board API client.
//
// Endpoint:
//   GET https://jobs.workable.com/api/v1/jobs?location={query}&limit={n}
//
// Notes on the API:
//   - Unlike the other ATS providers (Greenhouse / Lever / Ashby /
//     SmartRecruiters), Workable does NOT expose a useful per-account/per-slug
//     postings endpoint. The widely-cited
//     `apply.workable.com/api/v3/accounts/{slug}/jobs` POST exists, but for
//     most accounts it returns an empty list (it's intended for the SPA's own
//     filtered queries and depends on internal feature flags).
//   - The actual working public endpoint is the cross-customer firehose at
//     `jobs.workable.com/api/v1/jobs`, which is what Workable's own
//     `jobs.workable.com` site uses. It accepts a `location` query string and
//     `limit` (page size), and returns ~5k India jobs at the time of writing.
//   - So Workable is implemented like Adzuna — one keyword/location query —
//     not like Greenhouse — fan-out over a curated slug list. The companies.ts
//     entry below is a no-op kept for symmetry.
//   - The response embeds the company under `job.company.title`; we use that
//     as the ParsedJob.company. Source IDs are global UUIDs so no namespace
//     prefix is needed.

import type { FetchResult, ParsedJob } from './types'
import { isIndianRelevant } from './companies'

export type WorkableQuery = { location: string; limit?: number }

type WorkableJobLocation = {
  city?: string
  subregion?: string
  countryName?: string
  workplaceType?: string
}

type WorkableJob = {
  id: string
  title: string
  state?: string
  description?: string
  department?: string
  employmentType?: string
  url?: string
  applicationUrl?: string
  location?: WorkableJobLocation
  company?: {
    id?: string
    title?: string
    url?: string
  }
  postedOn?: string
  publishedOn?: string
  createdAt?: string
}

type WorkableResponse = {
  title?: string
  totalSize?: number
  jobs?: WorkableJob[]
  nextPageToken?: string | null
}

function formatLocation(loc: WorkableJobLocation | undefined): string {
  if (!loc) return 'Unknown'
  if (loc.workplaceType?.toLowerCase() === 'remote') return 'Remote'
  const parts = [loc.city, loc.subregion, loc.countryName].filter(Boolean)
  return parts.length ? parts.join(', ') : 'Unknown'
}

export async function fetchWorkableJobs(
  query: WorkableQuery = { location: 'India', limit: 100 },
): Promise<FetchResult> {
  const limit = query.limit ?? 100
  const url = `https://jobs.workable.com/api/v1/jobs?location=${encodeURIComponent(query.location)}&limit=${limit}`
  const errors: string[] = []
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      errors.push(`Workable ${query.location}: ${res.status} ${res.statusText}`)
      return { source: 'workable', jobs: [], errors }
    }
    const data = (await res.json()) as WorkableResponse
    const jobs: ParsedJob[] = (data.jobs ?? [])
      .filter((j) => j.state === undefined || j.state === 'published')
      .filter((j) => isIndianRelevant(formatLocation(j.location)))
      .map((j) => {
        const company = j.company?.title?.trim() || 'Unknown'
        return {
          source: 'workable',
          source_id: j.id,
          title: j.title,
          company,
          location: formatLocation(j.location),
          description: j.description ?? j.title,
          apply_url: j.applicationUrl ?? j.url ?? '',
          salary_min: null,
          salary_max: null,
          salary_currency: null,
          category: j.department ?? null,
          contract_type: j.employmentType ?? null,
          contract_time: j.location?.workplaceType ?? null,
          posted_at:
            j.publishedOn ?? j.postedOn ?? j.createdAt ?? new Date().toISOString(),
        }
      })
    return { source: 'workable', jobs, errors }
  } catch (err) {
    errors.push(
      `Workable ${query.location}: ${err instanceof Error ? err.message : String(err)}`,
    )
    return { source: 'workable', jobs: [], errors }
  }
}
