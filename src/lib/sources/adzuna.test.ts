import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAdzunaJobs } from './adzuna'

const sampleAdzunaResponse = {
  count: 2,
  results: [
    {
      id: 'job-1',
      title: 'Senior Engineer',
      description: 'Build great things.',
      redirect_url: 'https://adzuna.in/land/ad/12345',
      created: '2026-06-02T10:00:00Z',
      company: { display_name: 'Acme Pvt Ltd' },
      location: { display_name: 'Bengaluru', area: ['IN', 'Karnataka', 'Bengaluru'] },
      salary_min: 1500000,
      salary_max: 2500000,
      category: { label: 'IT Jobs', tag: 'it-jobs' },
      contract_type: 'permanent',
      contract_time: 'full_time',
    },
    {
      id: 'job-2',
      title: 'Designer',
      description: 'Design great things.',
      redirect_url: 'https://adzuna.in/land/ad/67890',
      created: '2026-06-02T11:00:00Z',
      company: { display_name: 'Foo Inc' },
      location: { display_name: 'Mumbai' },
      // no salary
    },
  ],
}

describe('fetchAdzunaJobs', () => {
  beforeEach(() => {
    vi.stubEnv('ADZUNA_APP_ID', 'test-app-id')
    vi.stubEnv('ADZUNA_APP_KEY', 'test-app-key')
  })

  it('calls Adzuna with correct URL and params', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sampleAdzunaResponse), { status: 200 }),
    )
    await fetchAdzunaJobs({ page: 1, resultsPerPage: 50 })

    expect(fetchSpy).toHaveBeenCalledOnce()
    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('https://api.adzuna.com/v1/api/jobs/in/search/1')
    expect(url).toContain('app_id=test-app-id')
    expect(url).toContain('app_key=test-app-key')
    expect(url).toContain('results_per_page=50')
    expect(url).toContain('content-type=application%2Fjson')
  })

  it('maps Adzuna fields into ParsedJob shape', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sampleAdzunaResponse), { status: 200 }),
    )
    const result = await fetchAdzunaJobs({ page: 1, resultsPerPage: 50 })

    expect(result.count).toBe(2)
    expect(result.jobs).toHaveLength(2)

    const [j1, j2] = result.jobs
    expect(j1).toMatchObject({
      source: 'adzuna',
      source_id: 'job-1',
      title: 'Senior Engineer',
      company: 'Acme Pvt Ltd',
      location: 'Bengaluru',
      apply_url: 'https://adzuna.in/land/ad/12345',
      posted_at: '2026-06-02T10:00:00Z',
      salary_min: 1500000,
      salary_max: 2500000,
      salary_currency: 'INR',
      category: 'IT Jobs',
      contract_type: 'permanent',
      contract_time: 'full_time',
    })
    expect(j2.salary_min).toBeNull()
    expect(j2.salary_max).toBeNull()
    expect(j2.salary_currency).toBeNull()
  })

  it('throws on non-OK HTTP', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('Forbidden', { status: 403 }),
    )
    await expect(fetchAdzunaJobs({ page: 1, resultsPerPage: 50 })).rejects.toThrow(/Adzuna/)
  })

  it('throws if env vars are missing', async () => {
    vi.stubEnv('ADZUNA_APP_ID', '')
    vi.stubEnv('ADZUNA_APP_KEY', '')
    await expect(fetchAdzunaJobs({ page: 1, resultsPerPage: 50 })).rejects.toThrow(/env/i)
  })
})
