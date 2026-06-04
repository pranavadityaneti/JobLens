// src/lib/dedup.ts
// Cross-source deduplication helpers.
//
// The dedup key is SHA256 of normalized(company) | normalized(title) |
// normalized(location). Normalization strips all non-alphanumerics and
// lowercases — same shape as the SQL backfill function so server-computed
// hashes match what's already in the DB.
import { createHash } from 'node:crypto'

export function normalizeDedupField(s: string | null | undefined): string {
  if (!s) return ''
  return s.toLowerCase().replace(/[^a-z0-9]+/gi, '')
}

export function computeDedupHash(
  company: string,
  title: string,
  location: string,
): string {
  const key = `${normalizeDedupField(company)}|${normalizeDedupField(title)}|${normalizeDedupField(location)}`
  return createHash('sha256').update(key).digest('hex')
}
