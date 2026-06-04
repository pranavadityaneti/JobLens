// src/lib/sources/smartrecruiters.ts
// SmartRecruiters public Postings API client.
//
// Endpoint:
//   GET https://api.smartrecruiters.com/v1/companies/{slug}/postings?limit=100
//
// Notes:
//   - The list response carries summary metadata only — the `jobAd.sections`
//     descriptions are NOT included. They live behind the per-posting detail
//     endpoint: `.../postings/{postingId}`. The MVP skips that second hop and
//     uses the title as a placeholder description; a future improvement can
//     hydrate descriptions for India-matched postings only.
//   - Slugs are case-sensitive (e.g. `Visa`, `BoschGroup`).

import type { FetchResult, ParsedJob } from './types'
import { isIndianRelevant } from './companies'

type SRPosting = {
  id: string
  name: string
  uuid?: string
  refNumber?: string
  releasedDate?: string
  createdOn?: string
  location?: {
    city?: string
    region?: string
    country?: string
    remote?: boolean
    fullLocation?: string
  }
  department?: { label?: string }
  function?: { label?: string }
  industry?: { label?: string }
  typeOfEmployment?: { label?: string }
  experienceLevel?: { label?: string }
  jobAd?: {
    sections?: {
      jobDescription?: { text?: string; title?: string }
      qualifications?: { text?: string; title?: string }
      additionalInformation?: { text?: string; title?: string }
    }
  }
  applyUrl?: string
}

type SRResponse = {
  offset?: number
  limit?: number
  totalFound?: number
  content?: SRPosting[]
}

function formatLocation(p: SRPosting): string {
  const loc = p.location
  if (!loc) return 'Unknown'
  if (loc.fullLocation) return loc.fullLocation
  const parts = [loc.city, loc.region, loc.country].filter(Boolean)
  return parts.length ? parts.join(', ') : 'Unknown'
}

function buildDescription(p: SRPosting): string {
  const sections = p.jobAd?.sections
  if (!sections) return p.name
  const parts: string[] = []
  const order = ['jobDescription', 'qualifications', 'additionalInformation'] as const
  for (const key of order) {
    const sec = sections[key]
    if (sec?.text) {
      if (sec.title) parts.push(`<h3>${sec.title}</h3>`)
      parts.push(sec.text)
    }
  }
  return parts.length ? parts.join('\n') : p.name
}

export async function fetchSmartRecruitersJobs(slug: string): Promise<FetchResult> {
  const url = `https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=100`
  const errors: string[] = []
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      errors.push(`SmartRecruiters ${slug}: ${res.status} ${res.statusText}`)
      return { source: 'smartrecruiters', jobs: [], errors }
    }
    const data = (await res.json()) as SRResponse
    const jobs: ParsedJob[] = (data.content ?? [])
      .filter((p) => isIndianRelevant(formatLocation(p)))
      .map((p) => ({
        source: 'smartrecruiters',
        source_id: p.id,
        title: p.name,
        company: slug,
        location: formatLocation(p),
        description: buildDescription(p),
        apply_url:
          p.applyUrl ?? `https://jobs.smartrecruiters.com/${slug}/${p.id}`,
        salary_min: null,
        salary_max: null,
        salary_currency: null,
        category: p.department?.label ?? p.function?.label ?? null,
        contract_type: p.typeOfEmployment?.label ?? null,
        contract_time: p.location?.remote ? 'Remote' : null,
        posted_at:
          p.releasedDate ?? p.createdOn ?? new Date().toISOString(),
      }))
    return { source: 'smartrecruiters', jobs, errors }
  } catch (err) {
    errors.push(
      `SmartRecruiters ${slug}: ${err instanceof Error ? err.message : String(err)}`,
    )
    return { source: 'smartrecruiters', jobs: [], errors }
  }
}
