// src/lib/sources/types.ts
// Shared types across all job sources. Each source maps its native shape
// into ParsedJob before upsert.

export type JobSource =
  | 'adzuna'
  | 'greenhouse'
  | 'lever'
  | 'ashby'
  | 'naukri'
  | 'linkedin'

export type ParsedJob = {
  source: JobSource
  source_id: string
  title: string
  company: string
  location: string
  description: string // can be HTML for ATS sources, plain text for Adzuna
  apply_url: string
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
  category: string | null
  contract_type: string | null
  contract_time: string | null
  posted_at: string // ISO timestamp
}

export type FetchResult = {
  source: JobSource
  jobs: ParsedJob[]
  errors: string[]
}
