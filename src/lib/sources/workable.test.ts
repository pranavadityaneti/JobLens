import { describe, it, expect, vi } from 'vitest'
import { fetchWorkableJobs } from './workable'

const sample = {
  title: 'Workable',
  totalSize: 2,
  jobs: [
    {
      id: 'ae77b05f-03b3-43ee-8524-1f1ca7ea9206',
      title: 'Client Support Analyst',
      state: 'published',
      description: '<p>Be the first point of contact for global clients.</p>',
      department: 'Client Experience',
      employmentType: 'Full-time',
      url: 'https://jobs.workable.com/view/abc',
      location: {
        city: 'Chennai',
        subregion: 'Tamil Nadu',
        countryName: 'India',
        workplaceType: 'office',
      },
      company: { id: 'co1', title: 'FE fundinfo' },
      publishedOn: '2026-06-01T10:00:00Z',
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      title: 'NYC Marketing Lead',
      state: 'published',
      employmentType: 'Full-time',
      url: 'https://jobs.workable.com/view/xyz',
      location: { city: 'New York', subregion: 'NY', countryName: 'United States' },
      company: { id: 'co2', title: 'Acme Co' },
      publishedOn: '2026-06-02T10:00:00Z',
    },
  ],
}

describe('fetchWorkableJobs', () => {
  it('queries jobs.workable.com/api/v1/jobs with location + limit', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    )
    await fetchWorkableJobs({ location: 'India', limit: 50 })
    expect(fetchSpy.mock.calls[0][0]).toBe(
      'https://jobs.workable.com/api/v1/jobs?location=India&limit=50',
    )
  })

  it('maps fields into ParsedJob and filters non-India postings', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    )
    const result = await fetchWorkableJobs({ location: 'India', limit: 100 })
    expect(result.jobs).toHaveLength(1)
    expect(result.jobs[0]).toMatchObject({
      source: 'workable',
      source_id: 'ae77b05f-03b3-43ee-8524-1f1ca7ea9206',
      title: 'Client Support Analyst',
      company: 'FE fundinfo',
      location: 'Chennai, Tamil Nadu, India',
      apply_url: 'https://jobs.workable.com/view/abc',
      category: 'Client Experience',
      contract_type: 'Full-time',
      contract_time: 'office',
      posted_at: '2026-06-01T10:00:00Z',
    })
    expect(result.jobs[0].description).toContain('global clients')
  })

  it('returns an empty result and surfaces error on non-OK response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('Bad Request', { status: 400 }),
    )
    const result = await fetchWorkableJobs({ location: 'India' })
    expect(result.jobs).toEqual([])
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toMatch(/400/)
  })
})
