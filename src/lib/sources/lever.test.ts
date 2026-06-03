import { describe, it, expect, vi } from 'vitest'
import { fetchLeverJobs } from './lever'

const sample = [
  {
    id: 'abc-123',
    text: 'Senior Backend Engineer',
    categories: {
      commitment: 'Full-time',
      department: 'Engineering',
      location: 'Bengaluru, India',
      team: 'Backend',
    },
    descriptionHtml: '<p>Backend engineering role.</p>',
    descriptionPlain: 'Backend engineering role.',
    lists: [{ text: 'Responsibilities', content: '<ul><li>Design APIs</li></ul>' }],
    additional: '<p>We are an equal opp employer.</p>',
    additionalPlain: 'We are an equal opp employer.',
    createdAt: 1717250000000,
    hostedUrl: 'https://jobs.lever.co/acme/abc-123',
  },
  {
    id: 'def-456',
    text: 'Designer',
    categories: {
      commitment: 'Full-time',
      department: 'Design',
      location: 'New York',
      team: 'Brand',
    },
    descriptionHtml: '<p>...</p>',
    descriptionPlain: '...',
    lists: [],
    createdAt: 1717250100000,
    hostedUrl: 'https://jobs.lever.co/acme/def-456',
  },
]

describe('fetchLeverJobs', () => {
  it('hits the Lever postings endpoint in JSON mode', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    )
    await fetchLeverJobs('acme')
    expect(fetchSpy.mock.calls[0][0]).toBe('https://api.lever.co/v0/postings/acme?mode=json')
  })

  it('maps fields into ParsedJob, concatenates lists, filters non-India', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    )
    const result = await fetchLeverJobs('acme')
    expect(result.jobs).toHaveLength(1)
    expect(result.jobs[0]).toMatchObject({
      source: 'lever',
      source_id: 'abc-123',
      title: 'Senior Backend Engineer',
      company: 'acme',
      location: 'Bengaluru, India',
      apply_url: 'https://jobs.lever.co/acme/abc-123',
      category: 'Engineering',
      contract_type: 'Full-time',
      posted_at: new Date(1717250000000).toISOString(),
    })
    // Description merges main + lists for richer content
    expect(result.jobs[0].description).toContain('Backend engineering role')
    expect(result.jobs[0].description).toContain('Responsibilities')
    expect(result.jobs[0].description).toContain('Design APIs')
  })

  it('returns empty + error on non-OK', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404 }),
    )
    const result = await fetchLeverJobs('nope')
    expect(result.jobs).toEqual([])
    expect(result.errors[0]).toMatch(/404/)
  })
})
