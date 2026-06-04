import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchLinkedinJobs } from './apify-linkedin'

const sample = [
  {
    id: '4421485248',
    title: 'Software Engineer',
    companyName: 'Deltek',
    location: 'India',
    descriptionHtml: '<p>Site Reliability role.</p>',
    descriptionText: 'Site Reliability role.',
    link: 'https://in.linkedin.com/jobs/view/software-engineer-at-deltek-4421485248',
    postedAt: '2026-05-29',
    employmentType: 'Full-time',
    jobFunction: 'Engineering',
    industries: 'Software Development',
    salary: '',
    seniorityLevel: 'Mid-Senior level',
  },
  {
    id: 4421485249,
    title: 'Data Scientist',
    companyName: 'Acme',
    location: 'Bengaluru, Karnataka, India',
    descriptionText: 'Build models.',
    link: 'https://in.linkedin.com/jobs/view/ds-4421485249',
    postedAt: '2026-06-01',
    employmentType: 'Part-time',
    jobFunction: 'Engineering and Information Technology',
  },
  {
    // Non-India location — should be filtered
    id: '999',
    title: 'Engineer (SF)',
    companyName: 'Foo',
    location: 'San Francisco, CA',
    descriptionHtml: '<p>SF.</p>',
    link: 'https://www.linkedin.com/jobs/view/999',
    postedAt: '2026-06-01',
  },
  {
    // Missing apply_url + link — drop
    id: '888',
    title: 'Broken',
    companyName: 'Nope',
    location: 'Mumbai',
    descriptionText: 'x',
    postedAt: '2026-06-01',
  },
]

describe('fetchLinkedinJobs', () => {
  beforeEach(() => {
    process.env.APIFY_API_TOKEN = 'test-token'
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('POSTs to curious_coder~linkedin-jobs-scraper with a LinkedIn search URL and count >= 10', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    )
    await fetchLinkedinJobs({ keyword: 'software engineer' })
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain(
      'https://api.apify.com/v2/acts/curious_coder~linkedin-jobs-scraper/run-sync-get-dataset-items',
    )
    expect(url).toContain('token=test-token')
    const init = fetchSpy.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('POST')
    const body = JSON.parse(String(init.body))
    expect(body.urls).toHaveLength(1)
    expect(body.urls[0]).toContain('linkedin.com/jobs/search/')
    expect(body.urls[0]).toContain('keywords=software+engineer')
    expect(body.urls[0]).toContain('location=India')
    expect(body.count).toBeGreaterThanOrEqual(10)
  })

  it('clamps count to a minimum of 10 (actor requirement)', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    )
    await fetchLinkedinJobs({ keyword: 'x', count: 3 })
    const body = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))
    expect(body.count).toBe(10)
  })

  it('maps fields into ParsedJob and filters non-India locations', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    )
    const result = await fetchLinkedinJobs({ keyword: 'software engineer' })
    expect(result.jobs).toHaveLength(2)
    expect(result.jobs[0]).toMatchObject({
      source: 'linkedin',
      source_id: '4421485248',
      title: 'Software Engineer',
      company: 'Deltek',
      location: 'India',
      description: '<p>Site Reliability role.</p>',
      apply_url:
        'https://in.linkedin.com/jobs/view/software-engineer-at-deltek-4421485248',
      category: 'Engineering',
      contract_time: 'full_time',
    })
    expect(result.jobs[1]).toMatchObject({
      source_id: '4421485249',
      contract_time: 'part_time',
    })
    expect(result.jobs[0].posted_at).toMatch(/^2026-05-29/)
  })

  it('returns an empty result and surfaces error on non-OK response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('Bad Request', { status: 400 }),
    )
    const result = await fetchLinkedinJobs({ keyword: 'designer' })
    expect(result.jobs).toEqual([])
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toMatch(/400/)
  })

  it('returns error when APIFY_API_TOKEN missing', async () => {
    delete process.env.APIFY_API_TOKEN
    const result = await fetchLinkedinJobs({ keyword: 'x' })
    expect(result.jobs).toEqual([])
    expect(result.errors[0]).toMatch(/APIFY_API_TOKEN/)
  })
})
