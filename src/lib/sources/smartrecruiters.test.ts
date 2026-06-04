import { describe, it, expect, vi } from 'vitest'
import { fetchSmartRecruitersJobs } from './smartrecruiters'

const sample = {
  offset: 0,
  limit: 100,
  totalFound: 2,
  content: [
    {
      id: '744000129971988',
      name: 'Senior Engineer',
      releasedDate: '2026-06-03T11:08:12.368Z',
      location: {
        city: 'Bengaluru',
        region: 'KA',
        country: 'in',
        fullLocation: 'Bengaluru, KA, India',
        remote: false,
      },
      department: { label: 'Cyber Security' },
      typeOfEmployment: { label: 'Full-time' },
      jobAd: {
        sections: {
          jobDescription: { title: 'Description', text: '<p>Build secure systems.</p>' },
          qualifications: { title: 'Qualifications', text: '<p>5+ years experience.</p>' },
        },
      },
      applyUrl: 'https://jobs.smartrecruiters.com/Visa/744000129971988',
    },
    {
      id: '744000122509268',
      name: 'Sr. SW Engineer',
      releasedDate: '2026-04-23T16:54:54.835Z',
      location: { city: 'Austin', country: 'us', fullLocation: 'Austin, TX, United States' },
      department: { label: 'Technology' },
      typeOfEmployment: { label: 'Full-time' },
      applyUrl: 'https://jobs.smartrecruiters.com/Visa/744000122509268',
    },
  ],
}

describe('fetchSmartRecruitersJobs', () => {
  it('queries the v1/companies/{slug}/postings endpoint with limit=100', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    )
    await fetchSmartRecruitersJobs('Visa')
    expect(fetchSpy.mock.calls[0][0]).toBe(
      'https://api.smartrecruiters.com/v1/companies/Visa/postings?limit=100',
    )
  })

  it('maps fields into ParsedJob and filters non-India postings', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    )
    const result = await fetchSmartRecruitersJobs('Visa')
    expect(result.jobs).toHaveLength(1)
    expect(result.jobs[0]).toMatchObject({
      source: 'smartrecruiters',
      source_id: '744000129971988',
      title: 'Senior Engineer',
      company: 'Visa',
      location: 'Bengaluru, KA, India',
      apply_url: 'https://jobs.smartrecruiters.com/Visa/744000129971988',
      category: 'Cyber Security',
      contract_type: 'Full-time',
      posted_at: '2026-06-03T11:08:12.368Z',
    })
    expect(result.jobs[0].description).toContain('<p>Build secure systems.</p>')
    expect(result.jobs[0].description).toContain('<p>5+ years experience.</p>')
  })

  it('returns an empty result and surfaces error on non-OK response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404 }),
    )
    const result = await fetchSmartRecruitersJobs('Nope')
    expect(result.jobs).toEqual([])
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toMatch(/404/)
  })
})
