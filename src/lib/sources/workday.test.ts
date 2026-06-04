import { describe, it, expect, vi } from 'vitest'
import { fetchWorkdayJobs } from './workday'

const tenant = { tenant: 'acme', site: 'External_Career_Site', wdHost: 'wd5' }

const sample = {
  total: 2,
  jobPostings: [
    {
      title: 'Senior SW Engineer',
      externalPath: '/job/India---Bangalore/Senior-SW-Engineer_R12345',
      locationsText: 'India - Bangalore',
      postedOn: 'Posted 3 Days Ago',
      bulletFields: ['R12345', 'India - Bangalore'],
    },
    {
      title: 'Sales Engineer',
      externalPath: '/job/USA---New-York/Sales-Engineer_R67890',
      locationsText: 'USA - New York',
      postedOn: 'Posted Today',
      bulletFields: ['R67890'],
    },
  ],
}

describe('fetchWorkdayJobs', () => {
  it('POSTs to the wday/cxs/{tenant}/{site}/jobs endpoint with the standard body', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    )
    await fetchWorkdayJobs(tenant)
    expect(fetchSpy.mock.calls[0][0]).toBe(
      'https://acme.wd5.myworkdayjobs.com/wday/cxs/acme/External_Career_Site/jobs',
    )
    const init = fetchSpy.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body as string)
    expect(body).toMatchObject({
      limit: 20,
      offset: 0,
      searchText: 'India',
      appliedFacets: {},
    })
  })

  it('maps fields into ParsedJob and filters non-India locations', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    )
    const result = await fetchWorkdayJobs(tenant)
    expect(result.jobs).toHaveLength(1)
    expect(result.jobs[0]).toMatchObject({
      source: 'workday',
      source_id: 'acme:R12345',
      title: 'Senior SW Engineer',
      company: 'acme',
      location: 'India - Bangalore',
      apply_url:
        'https://acme.wd5.myworkdayjobs.com/job/India---Bangalore/Senior-SW-Engineer_R12345',
      description: 'Senior SW Engineer',
    })
  })

  it('returns an empty result and surfaces error on non-OK response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('Unprocessable', { status: 422 }),
    )
    const result = await fetchWorkdayJobs(tenant)
    expect(result.jobs).toEqual([])
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toMatch(/422/)
  })
})
