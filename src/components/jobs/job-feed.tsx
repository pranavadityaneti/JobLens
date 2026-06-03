// src/components/jobs/job-feed.tsx
'use client'

import { useState } from 'react'
import { JobCard } from './job-card'
import { JobDetailSheet } from './job-detail-sheet'
import type { JobDetailData } from './job-detail'
import type { UserJobState } from '@/lib/user-jobs'

export type FeedJob = JobDetailData & {
  source: string
}

type Props = {
  jobs: FeedJob[]
  stateMap: Record<string, UserJobState>
}

export function JobFeed({ jobs, stateMap }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? jobs.find((j) => j.id === selectedId) ?? null : null
  const selectedState = selected ? stateMap[selected.id] ?? null : null

  return (
    <>
      <div className="flex flex-col gap-3">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            userState={stateMap[job.id] ?? null}
            onSelect={() => setSelectedId(job.id)}
          />
        ))}
      </div>
      <JobDetailSheet
        job={selected}
        userState={selectedState}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      />
    </>
  )
}
