import { describe, it, expect, vi } from 'vitest'
import { fetchGreenhouseJobs } from './greenhouse'

const sample = {
  jobs: [
    {
      id: 111,
      title: 'Senior Engineer',
      updated_at: '2026-06-01T10:00:00Z',
      absolute_url: 'https://boards.greenhouse.io/acme/jobs/111',
      location: { name: 'Bengaluru, India' },
      content: '<p>Build cool stuff.</p>',
      departments: [{ name: 'Engineering' }],
      offices: [{ name: 'Bengaluru' }],
      requisition_id: 'REQ-1',
    },
    {
      id: 222,
      title: 'Designer (San Francisco)',
      updated_at: '2026-06-01T11:00:00Z',
      absolute_url: 'https://boards.greenhouse.io/acme/jobs/222',
      location: { name: 'San Francisco, CA' },
      content: '<p>Make pretty things.</p>',
      departments: [{ name: 'Design' }],
      offices: [],
      requisition_id: 'REQ-2',
    },
  ],
}

describe('fetchGreenhouseJobs', () => {
  it('queries the boards-api endpoint with content=true', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    )
    await fetchGreenhouseJobs('acme')
    expect(fetchSpy.mock.calls[0][0]).toBe(
      'https://boards-api.greenhouse.io/v1/boards/acme/jobs?content=true',
    )
  })

  it('maps fields into ParsedJob and filters non-India locations', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    )
    const result = await fetchGreenhouseJobs('acme')
    expect(result.jobs).toHaveLength(1)
    expect(result.jobs[0]).toMatchObject({
      source: 'greenhouse',
      source_id: '111',
      title: 'Senior Engineer',
      company: 'acme',
      location: 'Bengaluru, India',
      description: '<p>Build cool stuff.</p>',
      apply_url: 'https://boards.greenhouse.io/acme/jobs/111',
      category: 'Engineering',
      posted_at: '2026-06-01T10:00:00Z',
    })
  })

  it('returns an empty result and surfaces error on non-OK response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404 }),
    )
    const result = await fetchGreenhouseJobs('nope')
    expect(result.jobs).toEqual([])
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toMatch(/404/)
  })
})
