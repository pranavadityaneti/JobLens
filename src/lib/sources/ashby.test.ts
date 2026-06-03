import { describe, it, expect, vi } from 'vitest'
import { fetchAshbyJobs } from './ashby'

const sample = {
  title: 'Acme Careers',
  jobs: [
    {
      id: 'job-1',
      title: 'Staff Engineer',
      department: 'Engineering',
      team: 'Infrastructure',
      employmentType: 'FullTime',
      location: 'Bengaluru',
      workplaceType: 'Remote',
      descriptionHtml: '<p>Build infra.</p>',
      descriptionPlain: 'Build infra.',
      publishedDate: '2026-06-01T00:00:00.000Z',
      jobUrl: 'https://jobs.ashbyhq.com/acme/job-1',
    },
    {
      id: 'job-2',
      title: 'Recruiter',
      department: 'People',
      team: '',
      employmentType: 'FullTime',
      location: 'San Francisco',
      workplaceType: 'On-site',
      descriptionHtml: '<p>...</p>',
      descriptionPlain: '...',
      publishedDate: '2026-06-01T00:00:00.000Z',
      jobUrl: 'https://jobs.ashbyhq.com/acme/job-2',
    },
  ],
}

describe('fetchAshbyJobs', () => {
  it('hits the Ashby job-board endpoint', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    )
    await fetchAshbyJobs('acme')
    expect(fetchSpy.mock.calls[0][0]).toBe(
      'https://api.ashbyhq.com/posting-api/job-board/acme?includeCompensation=true',
    )
  })

  it('maps fields and filters non-India / non-remote', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    )
    const result = await fetchAshbyJobs('acme')
    expect(result.jobs).toHaveLength(1)
    expect(result.jobs[0]).toMatchObject({
      source: 'ashby',
      source_id: 'job-1',
      title: 'Staff Engineer',
      company: 'acme',
      location: 'Bengaluru',
      apply_url: 'https://jobs.ashbyhq.com/acme/job-1',
      category: 'Engineering',
      contract_type: 'FullTime',
      contract_time: 'Remote',
      posted_at: '2026-06-01T00:00:00.000Z',
    })
  })

  it('returns empty + error on non-OK', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404 }),
    )
    const result = await fetchAshbyJobs('nope')
    expect(result.jobs).toEqual([])
    expect(result.errors[0]).toMatch(/404/)
  })
})
