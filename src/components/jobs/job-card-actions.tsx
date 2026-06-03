// src/components/jobs/job-card-actions.tsx
'use client'

import { useState, useTransition } from 'react'
import { Bookmark, EyeOff, Check } from 'lucide-react'
import { setUserJobState } from '@/app/(app)/actions'
import type { UserJobState } from '@/lib/user-jobs'
import { ApplyModal } from './apply-modal'

type Props = {
  jobId: string
  jobTitle: string
  company: string
  applyUrl: string
  initialState: UserJobState | null
}

export function JobCardActions({
  jobId,
  jobTitle,
  company,
  applyUrl,
  initialState,
}: Props) {
  // Optimistic state — we render instantly on click, server action follows.
  const [state, setState] = useState<UserJobState | null>(initialState)
  const [modalOpen, setModalOpen] = useState(false)
  const [, startTransition] = useTransition()

  const toggleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const next: UserJobState | null = state === 'saved' ? null : 'saved'
    setState(next)
    startTransition(async () => {
      const result = await setUserJobState(jobId, next)
      if (!result.ok) setState(state) // rollback on error
    })
  }

  const hide = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setState('hidden')
    startTransition(async () => {
      const result = await setUserJobState(jobId, 'hidden')
      if (!result.ok) setState(state)
    })
  }

  // If already applied, show a static badge instead of action buttons.
  if (state === 'applied') {
    return (
      <div className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
        <Check className="h-3.5 w-3.5" />
        Applied
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={toggleSave}
          aria-label={state === 'saved' ? 'Unsave job' : 'Save job'}
          aria-pressed={state === 'saved'}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
            state === 'saved'
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
          }`}
        >
          <Bookmark
            className="h-4 w-4"
            fill={state === 'saved' ? 'currentColor' : 'none'}
          />
        </button>
        <button
          type="button"
          onClick={hide}
          aria-label="Hide job"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <EyeOff className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setModalOpen(true)
          }}
          className="ml-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-600"
        >
          Apply
        </button>
      </div>
      <ApplyModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        jobId={jobId}
        jobTitle={jobTitle}
        company={company}
        applyUrl={applyUrl}
      />
    </>
  )
}
