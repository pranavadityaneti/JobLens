// src/lib/sources/greenhouse.ts
// Greenhouse Job Boards API client.
//
// Endpoint:
//   GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true
//
// Notes on the response:
//   - `content` is the full HTML description, but Greenhouse returns it
//     HTML-entity-encoded (e.g. "&lt;p&gt;..."). We decode entities here so
//     downstream renderers can either treat it as HTML or strip tags.
//   - No salary fields are returned by Greenhouse public API.

import type { FetchResult, ParsedJob } from './types'
import { isIndianRelevant } from './companies'

type GreenhouseJob = {
  id: number
  title: string
  updated_at: string
  absolute_url: string
  location?: { name?: string }
  content?: string
  departments?: { name: string }[]
  offices?: { name: string }[]
  requisition_id?: string
}

type GreenhouseResponse = {
  jobs: GreenhouseJob[]
}

/**
 * Decode the common HTML entities Greenhouse uses. Idempotent: input that
 * contains no entities (e.g. unit-test fixtures with raw "<p>...</p>")
 * passes through unchanged.
 */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&') // last to avoid double-decoding e.g. "&amp;lt;"
}

export async function fetchGreenhouseJobs(boardToken: string): Promise<FetchResult> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`
  const errors: string[] = []
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      errors.push(`Greenhouse ${boardToken}: ${res.status} ${res.statusText}`)
      return { source: 'greenhouse', jobs: [], errors }
    }
    const data = (await res.json()) as GreenhouseResponse
    const jobs: ParsedJob[] = (data.jobs ?? [])
      .filter((j) => isIndianRelevant(j.location?.name ?? ''))
      .map((j) => ({
        source: 'greenhouse',
        source_id: String(j.id),
        title: j.title,
        company: boardToken,
        location: j.location?.name ?? 'Unknown',
        description: decodeHtmlEntities(j.content ?? ''),
        apply_url: j.absolute_url,
        salary_min: null,
        salary_max: null,
        salary_currency: null,
        category: j.departments?.[0]?.name ?? null,
        contract_type: null,
        contract_time: null,
        posted_at: j.updated_at,
      }))
    return { source: 'greenhouse', jobs, errors }
  } catch (err) {
    errors.push(`Greenhouse ${boardToken}: ${err instanceof Error ? err.message : String(err)}`)
    return { source: 'greenhouse', jobs: [], errors }
  }
}
