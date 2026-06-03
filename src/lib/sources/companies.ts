// src/lib/sources/companies.ts
// Curated company lists per ATS. India-relevance filter shared by all sources.
//
// Slugs verified live against each ATS during initial integration. Dead/empty
// boards have been pruned. The unused-but-spec'd boards (atlassian, snowflake,
// doordash for Greenhouse; brex/ramp/etc for Lever; vercel for Ashby) are
// listed below in comments to make future re-checks easy.

export const GREENHOUSE_BOARDS: string[] = [
  // verified live with content (HTTP 200, jobs > 0)
  'airbnb',
  'stripe',
  'gitlab',
  'twilio',
  'mongodb',
  'okta',
  'discord',
  'cloudflare',
  // dead/empty as of integration: atlassian, snowflake, doordash (404), coinbase (0 jobs)
]

export const LEVER_SLUGS: string[] = [
  // verified live with content (HTTP 200, postings > 0)
  'mistral',
  'netflix', // 200 but currently empty — keep, may repopulate
  'plaid', // 200 but currently empty — keep, may repopulate
  // dead as of integration: notion, brex, ramp, mercury, airtable, coda,
  //   ironclad, intercom, figma, lattice (all 404)
]

export const ASHBY_SLUGS: string[] = [
  // verified live with content (HTTP 200, jobs > 0)
  'linear',
  'perplexity',
  'supabase',
  'replit',
  'railway',
  'modal',
  'openai',
  'elevenlabs',
  'cursor',
  // dead/empty as of integration: anthropic (404), vercel (0 jobs)
]

const INDIA_LOCATION_PATTERNS = [
  /\bindia\b/i,
  /\bbengaluru\b/i,
  /\bbangalore\b/i,
  /\bmumbai\b/i,
  /\bnew\s*delhi\b/i,
  /\bdelhi\b/i,
  /\bncr\b/i,
  /\bhyderabad\b/i,
  /\bchennai\b/i,
  /\bpune\b/i,
  /\bkolkata\b/i,
  /\bgurgaon\b/i,
  /\bgurugram\b/i,
  /\bnoida\b/i,
  /\bahmedabad\b/i,
]

const REMOTE_PATTERNS = [
  /\bremote\b/i,
  /\bworldwide\b/i,
  /\bglobal\b/i,
  /\banywhere\b/i,
  /\bdistributed\b/i,
]

/**
 * True if the location indicates the job is reachable to an Indian
 * candidate: explicitly Indian location, or genuinely remote/global.
 */
export function isIndianRelevant(location: string): boolean {
  if (!location) return false
  if (INDIA_LOCATION_PATTERNS.some((p) => p.test(location))) return true
  if (REMOTE_PATTERNS.some((p) => p.test(location))) return true
  return false
}
