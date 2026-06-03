// src/lib/sources/lever.ts
// Lever Postings API client.
//
// Endpoint:
//   GET https://api.lever.co/v0/postings/{slug}?mode=json
//
// Notes:
//   - Returns a raw JSON array of postings (no wrapper object).
//   - `descriptionHtml` has the main body. Structured sections live under
//     `lists` (each with a `text` heading and `content` HTML). `additional`
//     holds EOE / closing copy. We merge them in display order so the
//     stored description preserves the structure of the original posting.

import type { FetchResult, ParsedJob } from './types'
import { isIndianRelevant } from './companies'

type LeverList = { text?: string; content?: string }

type LeverPosting = {
  id: string
  text: string
  categories?: {
    commitment?: string
    department?: string
    location?: string
    team?: string
  }
  descriptionHtml?: string
  descriptionPlain?: string
  lists?: LeverList[]
  additional?: string
  additionalPlain?: string
  createdAt: number
  hostedUrl: string
}

function buildDescription(p: LeverPosting): string {
  const parts: string[] = []
  if (p.descriptionHtml) parts.push(p.descriptionHtml)
  for (const list of p.lists ?? []) {
    if (list.text && list.content) {
      parts.push(`<h3>${list.text}</h3>${list.content}`)
    } else if (list.content) {
      parts.push(list.content)
    }
  }
  if (p.additional) parts.push(p.additional)
  return parts.join('\n')
}

export async function fetchLeverJobs(slug: string): Promise<FetchResult> {
  const url = `https://api.lever.co/v0/postings/${slug}?mode=json`
  const errors: string[] = []
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      errors.push(`Lever ${slug}: ${res.status} ${res.statusText}`)
      return { source: 'lever', jobs: [], errors }
    }
    const data = (await res.json()) as LeverPosting[]
    const jobs: ParsedJob[] = (data ?? [])
      .filter((p) => isIndianRelevant(p.categories?.location ?? ''))
      .map((p) => ({
        source: 'lever',
        source_id: p.id,
        title: p.text,
        company: slug,
        location: p.categories?.location ?? 'Unknown',
        description: buildDescription(p),
        apply_url: p.hostedUrl,
        salary_min: null,
        salary_max: null,
        salary_currency: null,
        category: p.categories?.department ?? null,
        contract_type: p.categories?.commitment ?? null,
        contract_time: null,
        posted_at: new Date(p.createdAt).toISOString(),
      }))
    return { source: 'lever', jobs, errors }
  } catch (err) {
    errors.push(`Lever ${slug}: ${err instanceof Error ? err.message : String(err)}`)
    return { source: 'lever', jobs: [], errors }
  }
}
