// src/lib/sources/adzuna.ts
// Adzuna India API client. MVP: one-page fetch with results_per_page up to 50.
//
// Endpoint shape:
//   GET https://api.adzuna.com/v1/api/jobs/in/search/{page}?app_id=…&app_key=…&results_per_page=50&content-type=application/json

import type { ParsedJob } from './types'

export type { ParsedJob } from './types'

type AdzunaRawJob = {
  id: string
  title: string
  description: string
  redirect_url: string
  created: string
  company?: { display_name?: string }
  location?: { display_name?: string }
  salary_min?: number
  salary_max?: number
  category?: { label?: string }
  contract_type?: string
  contract_time?: string
}

type AdzunaResponse = {
  count: number
  results: AdzunaRawJob[]
}

export type FetchOptions = {
  page: number
  resultsPerPage: number
  where?: string
}

export async function fetchAdzunaJobs(opts: FetchOptions): Promise<{
  count: number
  jobs: ParsedJob[]
}> {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) {
    throw new Error('Adzuna env vars missing (ADZUNA_APP_ID / ADZUNA_APP_KEY)')
  }

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(opts.resultsPerPage),
    'content-type': 'application/json',
  })
  if (opts.where) params.set('where', opts.where)

  const url = `https://api.adzuna.com/v1/api/jobs/in/search/${opts.page}?${params.toString()}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    const body = await res.text().catch(() => '<no body>')
    throw new Error(`Adzuna request failed: ${res.status} ${body}`)
  }
  const data = (await res.json()) as AdzunaResponse

  const jobs: ParsedJob[] = (data.results ?? []).map((raw) => ({
    source: 'adzuna',
    source_id: raw.id,
    title: raw.title,
    company: raw.company?.display_name ?? 'Unknown',
    location: raw.location?.display_name ?? 'Unknown',
    description: raw.description,
    apply_url: raw.redirect_url,
    salary_min: typeof raw.salary_min === 'number' ? raw.salary_min : null,
    salary_max: typeof raw.salary_max === 'number' ? raw.salary_max : null,
    salary_currency:
      typeof raw.salary_min === 'number' || typeof raw.salary_max === 'number'
        ? 'INR'
        : null,
    category: raw.category?.label ?? null,
    contract_type: raw.contract_type ?? null,
    contract_time: raw.contract_time ?? null,
    posted_at: raw.created,
  }))

  return { count: data.count ?? jobs.length, jobs }
}
