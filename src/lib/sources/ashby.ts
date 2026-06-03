// src/lib/sources/ashby.ts
// Ashby Job Board posting API client.
//
// Endpoint:
//   GET https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true
//
// Notes:
//   - The live API exposes `publishedAt`; some older docs (and our spec test
//     fixture) use `publishedDate`. We accept either, preferring publishedAt.
//   - `workplaceType` is one of: Remote, Hybrid, On-site. We surface it in
//     the `contract_time` slot since that's currently used for the work-model
//     chip in the UI.

import type { FetchResult, ParsedJob } from './types'
import { isIndianRelevant } from './companies'

type AshbyJob = {
  id: string
  title: string
  department?: string
  team?: string
  employmentType?: string
  location?: string
  workplaceType?: string
  descriptionHtml?: string
  descriptionPlain?: string
  publishedAt?: string
  publishedDate?: string
  jobUrl: string
}

type AshbyResponse = {
  title?: string
  jobs?: AshbyJob[]
}

export async function fetchAshbyJobs(slug: string): Promise<FetchResult> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`
  const errors: string[] = []
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      errors.push(`Ashby ${slug}: ${res.status} ${res.statusText}`)
      return { source: 'ashby', jobs: [], errors }
    }
    const data = (await res.json()) as AshbyResponse
    const jobs: ParsedJob[] = (data.jobs ?? [])
      .filter((j) => isIndianRelevant(j.location ?? ''))
      .map((j) => ({
        source: 'ashby',
        source_id: j.id,
        title: j.title,
        company: slug,
        location: j.location ?? 'Unknown',
        description: j.descriptionHtml ?? j.descriptionPlain ?? '',
        apply_url: j.jobUrl,
        salary_min: null,
        salary_max: null,
        salary_currency: null,
        category: j.department ?? null,
        contract_type: j.employmentType ?? null,
        contract_time: j.workplaceType ?? null, // Remote / Hybrid / On-site
        posted_at: j.publishedAt ?? j.publishedDate ?? new Date().toISOString(),
      }))
    return { source: 'ashby', jobs, errors }
  } catch (err) {
    errors.push(`Ashby ${slug}: ${err instanceof Error ? err.message : String(err)}`)
    return { source: 'ashby', jobs: [], errors }
  }
}
