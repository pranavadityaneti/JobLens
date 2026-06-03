// src/lib/job-text.ts
// Heuristic extractors used by both the job-detail render and the filter
// post-pass. Pure functions, no React deps.

export type ExperienceBucket = 'Junior' | 'Mid' | 'Senior' | 'Lead'

/**
 * Best-effort extraction of experience requirement (e.g. "3-5 years")
 * from the job title and description. Returns null if no clear signal.
 */
export function extractExperience(title: string, description: string): string | null {
  const text = `${title} ${description}`
  // Match "3-5 years", "3 to 5 years", "5+ years", "minimum 3 years", "5 years exp"
  const range = text.match(/(\d{1,2})\s*[-–to]+\s*(\d{1,2})\s*(?:\+)?\s*years?/i)
  if (range) return `${range[1]}–${range[2]} years`
  const plus = text.match(/(\d{1,2})\s*\+\s*years?/i)
  if (plus) return `${plus[1]}+ years`
  const min = text.match(/min(?:imum)?\s*(\d{1,2})\s*years?/i)
  if (min) return `${min[1]}+ years`
  const single = text.match(/(\d{1,2})\s*years?\s*(?:of\s*)?(?:experience|exp)/i)
  if (single) return `${single[1]} years`
  return null
}

/**
 * Bucket the experience signal into Junior/Mid/Senior/Lead. Returns null
 * if no clear signal — used by the filter pipeline to decide if a job
 * matches a user's "Senior" selection.
 */
export function extractExperienceBucket(
  title: string,
  description: string,
): ExperienceBucket | null {
  const t = `${title} ${description}`.toLowerCase()
  if (/\b(intern|trainee|graduate)\b/.test(t)) return 'Junior'
  if (/\b(junior|entry[-\s]?level|jr\.?|0[-–]2\s*years?|1[-–]3\s*years?)\b/.test(t)) return 'Junior'
  if (/\b(staff|lead|principal|head\s+of|director\s+of|vp\s+of|chief)\b/.test(t)) return 'Lead'
  if (/\b(senior|sr\.?|7\+\s*years?|8\+\s*years?|10\+\s*years?)\b/.test(t)) return 'Senior'
  // explicit numeric ranges → bucket
  const m = t.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s*years?/)
  if (m) {
    const max = parseInt(m[2], 10)
    if (max <= 3) return 'Junior'
    if (max <= 6) return 'Mid'
    if (max <= 9) return 'Senior'
    return 'Lead'
  }
  const plus = t.match(/(\d{1,2})\s*\+\s*years?/)
  if (plus) {
    const n = parseInt(plus[1], 10)
    if (n <= 2) return 'Junior'
    if (n <= 5) return 'Mid'
    if (n <= 8) return 'Senior'
    return 'Lead'
  }
  return null
}

export type WorkModel = 'Remote' | 'Hybrid' | 'On-site'

/**
 * Best-effort detection of work model (Remote / Hybrid / On-site) from the
 * description. Returns null if no clear signal.
 */
export function extractWorkModel(description: string): WorkModel | null {
  const t = description.toLowerCase()
  if (/\b(fully\s+remote|100%?\s*remote|remote\s*[-–]?\s*anywhere|wfh\s*permanent)\b/.test(t)) return 'Remote'
  if (/\bhybrid\b/.test(t)) return 'Hybrid'
  if (/\b(on[\s-]?site|onsite|in[\s-]?office|office[\s-]?based)\b/.test(t)) return 'On-site'
  if (/\bremote\b/.test(t)) return 'Remote'
  return null
}
