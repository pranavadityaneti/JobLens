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

// Apify search queries — curated keyword × location pairs for Naukri/LinkedIn.
// Each entry runs once per ingest cycle against both Apify sources. ~8 queries
// × ~50 jobs/query ≈ 400 jobs per source per cycle.
export const APIFY_SEARCH_QUERIES: { keyword: string; location: string }[] = [
  { keyword: 'software engineer', location: 'India' },
  { keyword: 'product manager', location: 'India' },
  { keyword: 'data scientist', location: 'India' },
  { keyword: 'designer', location: 'India' },
  { keyword: 'marketing', location: 'India' },
  { keyword: 'sales', location: 'India' },
  { keyword: 'engineer', location: 'Bangalore' },
  { keyword: 'engineer', location: 'Mumbai' },
]

// ---- Workday tenants ---------------------------------------------------
// Pattern per company: { tenant, site, wdHost } where wdHost is the wd{N}
// subdomain Workday assigns (varies per tenant; common values are wd1, wd3,
// wd5, wd12, wd103). Verified live against the cxs endpoint during
// integration; entries whose site IDs returned HTTP 422 (e.g. tcs, jpmc,
// ibm, microsoft, vmware, oracle, ge, deloitte) were dropped.
export const WORKDAY_TENANTS: Array<{
  tenant: string
  site: string
  wdHost: string
}> = [
  { tenant: 'salesforce', site: 'External_Career_Site', wdHost: 'wd12' },
  { tenant: 'accenture', site: 'AccentureCareers', wdHost: 'wd103' },
  { tenant: 'pwc', site: 'Global_Experienced_Careers', wdHost: 'wd3' },
  { tenant: 'nvidia', site: 'NVIDIAExternalCareerSite', wdHost: 'wd5' },
  { tenant: 'intel', site: 'External', wdHost: 'wd1' },
  // dropped (422 on cxs jobs endpoint with default body):
  //   tcs/Tcs_Career, jpmc/External_Career_Site, ibm/External_Career_Site,
  //   microsoft/External, vmware/VMware_Careers, oracle/Oracle,
  //   boa/Bank_of_America_Careers, hsbc/HSBC_Holdings_PLC, ey/EYGlobalCareers,
  //   kpmg/KPMG_Careers, deloitte/US_External_Career_Site, ge/GE_ExternalSite,
  //   morganstanley/External, amd/External — site IDs not public for those.
]
