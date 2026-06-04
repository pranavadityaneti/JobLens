import { describe, it, expect, vi } from 'vitest'
import { fetchBambooHRJobs } from './bamboohr'

const sample = {
  meta: { totalCount: 2 },
  result: [
    {
      id: 101,
      jobOpeningName: 'Senior Engineer',
      departmentId: '18560',
      departmentLabel: 'Engineering',
      employmentStatusLabel: 'Full-Time',
      location: { city: 'Bengaluru', state: 'Karnataka' },
      atsLocation: { country: 'India', city: 'Bengaluru', state: 'Karnataka', province: null },
      isRemote: false,
      jobOpeningStatus: 'Open',
      datePosted: '2026-06-01',
    },
    {
      id: 102,
      jobOpeningName: 'NYC Designer',
      departmentLabel: 'Design',
      employmentStatusLabel: 'Full-Time',
      location: { city: 'New York', state: 'NY' },
      atsLocation: { country: 'United States', city: 'New York', state: 'NY' },
      isRemote: false,
      jobOpeningStatus: 'Open',
      datePosted: '2026-06-02',
    },
  ],
}

describe('fetchBambooHRJobs', () => {
  it('queries the {subdomain}.bamboohr.com/careers/list?format=json endpoint', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    )
    await fetchBambooHRJobs('acme')
    expect(fetchSpy.mock.calls[0][0]).toBe(
      'https://acme.bamboohr.com/careers/list?format=json',
    )
    const init = fetchSpy.mock.calls[0][1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers['User-Agent']).toMatch(/Mozilla/)
  })

  it('maps fields into ParsedJob and filters non-India postings', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    )
    const result = await fetchBambooHRJobs('acme')
    expect(result.jobs).toHaveLength(1)
    expect(result.jobs[0]).toMatchObject({
      source: 'bamboohr',
      source_id: 'acme:101',
      title: 'Senior Engineer',
      company: 'acme',
      location: 'Bengaluru, Karnataka, India',
      apply_url: 'https://acme.bamboohr.com/careers/101',
      category: 'Engineering',
      contract_type: 'Full-Time',
      posted_at: '2026-06-01',
    })
  })

  it('returns an empty result and surfaces error on non-OK response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('Forbidden', { status: 403 }),
    )
    const result = await fetchBambooHRJobs('blocked')
    expect(result.jobs).toEqual([])
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toMatch(/403/)
  })
})
