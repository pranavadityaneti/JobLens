import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchNaukriJobs } from './apify-naukri'

const sample = [
  {
    jobId: '030626503223',
    title: 'Software Engineer',
    companyName: 'Texas Instruments',
    location: 'Daman & Diu, Bengaluru',
    jobDescription: '<p>Embedded firmware role.</p>',
    jdURL: 'https://www.naukri.com/job-listings-software-engineer-030626503223',
    createdDate: '2026-06-03 11:03:54',
    salaryDetail: {
      minimumSalary: 0,
      maximumSalary: 0,
      currency: 'INR',
      hideSalary: true,
    },
    experience: '0-3 Yrs',
    tagsAndSkills: 'Embedded,C++',
  },
  {
    jobId: '020626921703',
    title: 'Senior Backend Engineer',
    companyName: 'Acme Inc',
    location: 'Bengaluru',
    jobDescription: '<p>Backend.</p>',
    jdURL: 'https://www.naukri.com/job-listings-backend-020626921703',
    createdDate: '2026-06-02 11:47:31',
    salaryDetail: {
      minimumSalary: 1500000,
      maximumSalary: 2500000,
      currency: 'INR',
      hideSalary: false,
    },
  },
  {
    // Non-India job should be filtered out by isIndianRelevant
    jobId: '999',
    title: 'Engineer (SF)',
    companyName: 'Foo Co',
    location: 'San Francisco, CA',
    jobDescription: '<p>SF.</p>',
    jdURL: 'https://www.naukri.com/job-listings-sf-999',
    createdDate: '2026-06-01 10:00:00',
    salaryDetail: { hideSalary: true },
  },
  {
    // Missing required field (applyUrl) — should be dropped
    jobId: '888',
    title: 'Broken',
    companyName: 'Nope',
    location: 'Mumbai',
    jobDescription: '<p>x</p>',
    jdURL: '',
    createdDate: '2026-06-01 10:00:00',
  },
]

describe('fetchNaukriJobs', () => {
  beforeEach(() => {
    process.env.APIFY_API_TOKEN = 'test-token'
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('POSTs to the muhammetakkurtt~naukri-job-scraper run-sync endpoint with token', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    )
    await fetchNaukriJobs({ keyword: 'software engineer' })
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain(
      'https://api.apify.com/v2/acts/muhammetakkurtt~naukri-job-scraper/run-sync-get-dataset-items',
    )
    expect(url).toContain('token=test-token')
    const init = fetchSpy.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('POST')
    const body = JSON.parse(String(init.body))
    expect(body).toEqual({
      keyword: 'software engineer',
      location: 'India',
      maxItems: 50,
    })
  })

  it('maps fields into ParsedJob and filters non-India locations', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    )
    const result = await fetchNaukriJobs({ keyword: 'software engineer' })
    expect(result.jobs).toHaveLength(2)
    expect(result.jobs[0]).toMatchObject({
      source: 'naukri',
      source_id: '030626503223',
      title: 'Software Engineer',
      company: 'Texas Instruments',
      location: 'Daman & Diu, Bengaluru',
      apply_url:
        'https://www.naukri.com/job-listings-software-engineer-030626503223',
      salary_min: null,
      salary_max: null,
      salary_currency: null,
    })
    expect(result.jobs[1]).toMatchObject({
      source: 'naukri',
      source_id: '020626921703',
      salary_min: 1500000,
      salary_max: 2500000,
      salary_currency: 'INR',
    })
    // createdDate normalized to ISO
    expect(result.jobs[0].posted_at).toMatch(/^2026-06-03T11:03:54/)
  })

  it('returns an empty result and surfaces error on non-OK response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('Bad Request', { status: 400 }),
    )
    const result = await fetchNaukriJobs({ keyword: 'designer' })
    expect(result.jobs).toEqual([])
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toMatch(/400/)
  })

  it('returns error when APIFY_API_TOKEN missing', async () => {
    delete process.env.APIFY_API_TOKEN
    const result = await fetchNaukriJobs({ keyword: 'x' })
    expect(result.jobs).toEqual([])
    expect(result.errors[0]).toMatch(/APIFY_API_TOKEN/)
  })
})
