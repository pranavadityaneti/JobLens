// src/lib/job-filters.ts
// Typed filter state for the jobs dashboard. Lives in the URL query string
// so it survives reloads / back-forward / link sharing.

import type { ExperienceBucket, WorkModel } from './job-text'

export type DateBucket = '24h' | '3d' | '7d' | '14d' | '30d' | 'all'

export type SortKey = 'newest' | 'salary_desc' | 'salary_asc'

export type FilterState = {
  q: string
  locations: string[]
  subRoles: string[]
  industries: string[]
  contractTypes: string[]
  workModels: WorkModel[]
  experience: ExperienceBucket[]
  skills: string[]
  date: DateBucket
  salaryMin: number | null
  salaryMax: number | null
  sort: SortKey
  perPage: number
}

export const DEFAULT_PER_PAGE = 25
export const SALARY_SLIDER_MIN = 0
export const SALARY_SLIDER_MAX = 5_000_000
export const SALARY_SLIDER_STEP = 50_000

export const DEFAULT_FILTERS: FilterState = {
  q: '',
  locations: [],
  subRoles: [],
  industries: [],
  contractTypes: [],
  workModels: [],
  experience: [],
  skills: [],
  date: 'all',
  salaryMin: null,
  salaryMax: null,
  sort: 'newest',
  perPage: DEFAULT_PER_PAGE,
}

// Each label expands to a list of ILIKE patterns. Matches union.
// Raw DB values vary wildly ("Bengaluru, India", "Bangalore", "Remote - US",
// "FullTime" vs "Full-time") so we group user-visible labels to the patterns
// they should match against.
export const LOCATION_GROUPS: Record<string, string[]> = {
  'Bengaluru / Bangalore': ['Bengaluru', 'Bangalore'],
  'Mumbai': ['Mumbai'],
  'Delhi / NCR': ['Delhi', 'NCR', 'New Delhi'],
  'Hyderabad': ['Hyderabad'],
  'Chennai': ['Chennai'],
  'Pune': ['Pune'],
  'Kolkata': ['Kolkata'],
  'Gurgaon / Gurugram': ['Gurugram', 'Gurgaon'],
  'Noida': ['Noida'],
  'Ahmedabad': ['Ahmedabad'],
  'Remote (India)': ['Remote, India', 'Remote - India', 'India - Remote'],
  // "Remote" matches any string containing "remote" (including "Remote - US")
  // — intentional: user opted in to remote roles regardless of country.
  'Remote (Global)': ['Distributed', 'Worldwide', 'Anywhere', 'Remote'],
  'India (anywhere)': [
    'Bengaluru', 'Bangalore', 'Mumbai', 'Delhi', 'NCR', 'Hyderabad',
    'Chennai', 'Pune', 'Kolkata', 'Gurugram', 'Gurgaon', 'Noida',
    'Ahmedabad', 'India',
  ],
}

export const LOCATION_OPTIONS: readonly string[] = Object.keys(LOCATION_GROUPS)

// Contract type values arrive in many shapes ("FullTime", "full_time",
// "permanent" all mean the same thing). Group canonical labels to the raw
// values we OR-match against in `contract_type`.
export const CONTRACT_TYPE_GROUPS: Record<string, string[]> = {
  'Full-time': ['Full-time', 'FullTime', 'Full Time', 'full_time', 'fulltime', 'permanent', 'Permanent'],
  'Part-time': ['Part-time', 'PartTime', 'Part Time', 'part_time', 'parttime'],
  'Contract': ['Contract', 'contract', 'Contractor'],
  'Internship': ['Internship', 'intern', 'Intern', 'Trainee'],
  'Freelance': ['Freelance', 'freelance'],
  'Temporary': ['Temporary', 'temporary', 'Temp'],
}

export const CONTRACT_TYPE_OPTIONS: readonly string[] = Object.keys(CONTRACT_TYPE_GROUPS)

// Hierarchical Function taxonomy: 15 parent functions × ~100 sub-roles.
// Sub-roles are classified per-job by title keywords in `@/lib/job-function`,
// so the filter is applied post-fetch (no DB query expansion).
//
// Note: this was previously named INDUSTRY_GROUPS, but the buckets were
// actually job functions (Engineering, Product, …) — a true Industry filter
// (Fintech / EdTech / …) lands in a later batch.
export const FUNCTION_GROUPS: Array<{ label: string; subRoles: string[] }> = [
  { label: 'Engineering', subRoles: [
    'Backend Engineering', 'Frontend Engineering', 'Full-stack Engineering',
    'Mobile Engineering (iOS)', 'Mobile Engineering (Android)', 'Mobile Engineering (Cross-platform)',
    'DevOps / SRE', 'Platform Engineering', 'Infrastructure Engineering', 'Cloud Engineering',
    'Data Engineering', 'QA / Test Engineering', 'Embedded / Firmware', 'Hardware Engineering',
    'ML Engineering', 'Security Engineering', 'Engineering Management', 'Solutions / Sales Engineering',
  ]},
  { label: 'Data & Analytics', subRoles: [
    'Data Science', 'Data Analytics / BI', 'ML / AI Research', 'Quantitative Research', 'Analytics Engineering',
  ]},
  { label: 'Product', subRoles: [
    'Product Management', 'Technical Product Management', 'Product Operations',
    'Product Marketing (PMM)', 'Growth Product',
  ]},
  { label: 'Design', subRoles: [
    'Product Design', 'UX Design', 'UI Design', 'Visual Design', 'Graphic Design',
    'Brand Design', 'Motion / Interaction Design', 'UX Research', 'Service Design', 'Industrial Design',
  ]},
  { label: 'Sales', subRoles: [
    'Account Executive', 'Business Development', 'Sales Development Rep (SDR)',
    'Account Management', 'Solutions / Pre-sales', 'Field Sales', 'Inside Sales',
    'Channel / Partner Sales', 'Sales Operations',
  ]},
  { label: 'Marketing', subRoles: [
    'Performance / Growth Marketing', 'Content Marketing', 'Brand Marketing',
    'SEO / SEM', 'Social Media', 'PR & Communications', 'Marketing Operations',
    'Lifecycle / CRM Marketing', 'Influencer Marketing', 'Event Marketing',
  ]},
  { label: 'Customer Success / Support', subRoles: [
    'Customer Success Management', 'Customer Support', 'Implementation / Onboarding',
    'Technical Account Management', 'Customer Experience',
  ]},
  { label: 'Operations', subRoles: [
    'Business Operations', 'Strategy & Operations', 'Supply Chain', 'Logistics',
    'Program Management', 'Project Management', 'Vendor Management', 'Office Operations',
  ]},
  { label: 'HR / People', subRoles: [
    'Talent Acquisition (Tech)', 'Talent Acquisition (Non-tech)', 'HR Business Partner',
    'Compensation & Benefits', 'Learning & Development', 'People Operations', 'DEI', 'Employer Branding',
  ]},
  { label: 'Finance & Accounting', subRoles: [
    'FP&A', 'Accounting', 'Controller / Bookkeeping', 'Treasury',
    'Internal Audit', 'Investor Relations', 'Tax', 'Procurement',
  ]},
  { label: 'Legal & Compliance', subRoles: [
    'Corporate Legal', 'IP / Patent Law', 'Privacy / Data Protection',
    'Regulatory Compliance', 'Contract Management',
  ]},
  { label: 'Security', subRoles: [
    'Information Security', 'Application Security (AppSec)', 'Security Operations (SOC)',
    'Penetration Testing', 'GRC',
  ]},
  { label: 'IT', subRoles: [
    'IT Operations', 'IT Support / Helpdesk', 'Systems Administration', 'Network Engineering',
  ]},
  { label: 'Consulting & Advisory', subRoles: [
    'Management Consulting', 'Strategy Consulting', 'Industry Consulting',
  ]},
  { label: 'Other / Specialized', subRoles: [
    'Editorial / Content', 'Recruitment Consultant',
    'Healthcare — Clinical', 'Healthcare — Regulatory Affairs', 'Other',
  ]},
]

// Flat list of 20 industries representing the company's sector (Fintech,
// EdTech, …). Distinct from FUNCTION_GROUPS, which describes the role's
// department. Classification lives in `@/lib/job-industry` and runs post-fetch
// off the job's `company` field.
export const INDUSTRY_OPTIONS: string[] = [
  'Software & SaaS',
  'Internet / Consumer Apps',
  'AI / ML',
  'Cybersecurity',
  'Hardware / Semiconductors',
  'Banking & Fintech',
  'Insurance & InsurTech',
  'Investments / Asset Management',
  'Pharma & Biotech',
  'Medical Devices',
  'Healthcare Services / HealthTech',
  'E-commerce & Retail',
  'Education & EdTech',
  'Media, Entertainment & Gaming',
  'Real Estate & PropTech',
  'Manufacturing & Industrial',
  'Energy, Utilities & CleanTech',
  'Logistics & Mobility',
  'Travel, Hospitality & Food',
  'Consulting & Professional Services',
  'Other',
]

export const WORK_MODEL_OPTIONS: readonly WorkModel[] = ['Remote', 'Hybrid', 'On-site']

export const EXPERIENCE_OPTIONS: readonly ExperienceBucket[] = ['Junior', 'Mid', 'Senior', 'Lead']

export const DATE_OPTIONS: ReadonlyArray<{ value: DateBucket; label: string }> = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '3d', label: 'Last 3 days' },
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'Any time' },
]

export const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'salary_desc', label: 'Salary: high to low' },
  { value: 'salary_asc', label: 'Salary: low to high' },
]

export const PER_PAGE_OPTIONS: readonly number[] = [25, 50, 100]

const VALID_DATE = new Set<DateBucket>(['24h', '3d', '7d', '14d', '30d', 'all'])
const VALID_SORT = new Set<SortKey>(['newest', 'salary_desc', 'salary_asc'])
const VALID_WORK_MODEL = new Set<WorkModel>(['Remote', 'Hybrid', 'On-site'])
const VALID_EXPERIENCE = new Set<ExperienceBucket>(['Junior', 'Mid', 'Senior', 'Lead'])

/**
 * Parse a `URLSearchParams` into a fully-typed FilterState, applying
 * sensible defaults for missing/invalid values.
 */
export function parseFilters(sp: URLSearchParams): FilterState {
  const arr = (k: string) => sp.getAll(k).filter(Boolean)

  const dateRaw = sp.get('date')
  const date: DateBucket = dateRaw && VALID_DATE.has(dateRaw as DateBucket)
    ? (dateRaw as DateBucket)
    : 'all'

  const sortRaw = sp.get('sort')
  const sort: SortKey = sortRaw && VALID_SORT.has(sortRaw as SortKey)
    ? (sortRaw as SortKey)
    : 'newest'

  const workModels = arr('wm').filter((v): v is WorkModel =>
    VALID_WORK_MODEL.has(v as WorkModel),
  )
  const experience = arr('exp').filter((v): v is ExperienceBucket =>
    VALID_EXPERIENCE.has(v as ExperienceBucket),
  )

  const perPageRaw = sp.get('pp')
  const perPageParsed = perPageRaw ? Number(perPageRaw) : DEFAULT_PER_PAGE
  const perPage = PER_PAGE_OPTIONS.includes(perPageParsed) ? perPageParsed : DEFAULT_PER_PAGE

  const sminRaw = sp.get('smin')
  const smaxRaw = sp.get('smax')
  const salaryMin = sminRaw && !Number.isNaN(Number(sminRaw)) ? Number(sminRaw) : null
  const salaryMax = smaxRaw && !Number.isNaN(Number(smaxRaw)) ? Number(smaxRaw) : null

  return {
    q: sp.get('q') ?? '',
    locations: arr('loc'),
    subRoles: arr('fn'),
    industries: arr('ind'),
    contractTypes: arr('ctype'),
    workModels,
    experience,
    skills: arr('skill'),
    date,
    salaryMin,
    salaryMax,
    sort,
    perPage,
  }
}

/**
 * Serialize a FilterState into URLSearchParams, omitting default values so
 * the URL stays clean when filters are off.
 */
export function serializeFilters(f: FilterState): URLSearchParams {
  const sp = new URLSearchParams()
  if (f.q) sp.set('q', f.q)
  f.locations.forEach((v) => sp.append('loc', v))
  f.subRoles.forEach((v) => sp.append('fn', v))
  f.industries.forEach((v) => sp.append('ind', v))
  f.contractTypes.forEach((v) => sp.append('ctype', v))
  f.workModels.forEach((v) => sp.append('wm', v))
  f.experience.forEach((v) => sp.append('exp', v))
  f.skills.forEach((v) => sp.append('skill', v))
  if (f.date !== 'all') sp.set('date', f.date)
  if (f.salaryMin != null) sp.set('smin', String(f.salaryMin))
  if (f.salaryMax != null) sp.set('smax', String(f.salaryMax))
  if (f.sort !== 'newest') sp.set('sort', f.sort)
  if (f.perPage !== DEFAULT_PER_PAGE) sp.set('pp', String(f.perPage))
  return sp
}

/**
 * True when no filter is active (sort + perPage are presentation concerns,
 * not filtering — they don't count).
 */
export function isFilterEmpty(f: FilterState): boolean {
  return (
    !f.q &&
    f.locations.length === 0 &&
    f.subRoles.length === 0 &&
    f.industries.length === 0 &&
    f.contractTypes.length === 0 &&
    f.workModels.length === 0 &&
    f.experience.length === 0 &&
    f.skills.length === 0 &&
    f.date === 'all' &&
    f.salaryMin == null &&
    f.salaryMax == null
  )
}

/**
 * ISO timestamp for the "posted_at >= cutoff" filter, or null when the
 * "any time" bucket is selected.
 */
export function dateCutoffIso(d: DateBucket): string | null {
  if (d === 'all') return null
  const days: Record<Exclude<DateBucket, 'all'>, number> = {
    '24h': 1,
    '3d': 3,
    '7d': 7,
    '14d': 14,
    '30d': 30,
  }
  return new Date(Date.now() - days[d] * 24 * 60 * 60 * 1000).toISOString()
}
