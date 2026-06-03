// src/components/jobs/job-feed.tsx
'use client'

import { useState } from 'react'
import { JobCard } from './job-card'
import { JobDetailSheet } from './job-detail-sheet'
import type { JobDetailData } from './job-detail'
import type { UserJobFlags } from '@/lib/user-jobs'

// Inlined to keep this client module free of any server-only imports
// (the `user-jobs` module pulls in `next/headers` via the supabase server
// client).
const NO_FLAGS: UserJobFlags = { saved: false, applied: false, hidden: false }

export type FeedJob = JobDetailData & {
  source: string
}

type Props = {
  jobs: FeedJob[]
  flagsMap: Record<string, UserJobFlags>
}

export function JobFeed({ jobs, flagsMap }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? jobs.find((j) => j.id === selectedId) ?? null : null
  const selectedFlags = selected ? flagsMap[selected.id] ?? NO_FLAGS : NO_FLAGS

  return (
    <>
      <div className="flex flex-col gap-3">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            flags={flagsMap[job.id] ?? NO_FLAGS}
            onSelect={() => setSelectedId(job.id)}
          />
        ))}
      </div>
      <JobDetailSheet
        job={selected}
        flags={selectedFlags}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      />
    </>
  )
}
