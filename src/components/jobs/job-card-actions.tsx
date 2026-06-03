// src/components/jobs/job-card-actions.tsx
'use client'

import { useState, useTransition } from 'react'
import { Bookmark, EyeOff, Check } from 'lucide-react'
import { setUserJobFlagAction } from '@/app/(app)/actions'
import type { UserJobFlags } from '@/lib/user-jobs'
import { ApplyModal } from './apply-modal'

type Props = {
  jobId: string
  jobTitle: string
  company: string
  applyUrl: string
  initialFlags: UserJobFlags
}

export function JobCardActions({
  jobId,
  jobTitle,
  company,
  applyUrl,
  initialFlags,
}: Props) {
  const [flags, setFlags] = useState<UserJobFlags>(initialFlags)
  const [modalOpen, setModalOpen] = useState(false)
  const [, startTransition] = useTransition()

  const toggleSaved = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const next = !flags.saved
    const prev = flags
    setFlags({ ...flags, saved: next })
    startTransition(async () => {
      const result = await setUserJobFlagAction(jobId, 'saved', next)
      if (!result.ok) setFlags(prev)
    })
  }

  const hide = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const prev = flags
    setFlags({ ...flags, hidden: true })
    startTransition(async () => {
      const result = await setUserJobFlagAction(jobId, 'hidden', true)
      if (!result.ok) setFlags(prev)
    })
  }

  const openApplyModal = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setModalOpen(true)
  }

  // After user confirms in modal — modal calls back to update applied flag
  const onApplied = () => {
    setFlags({ ...flags, applied: true })
  }

  return (
    <>
      <div className="flex flex-shrink-0 items-center gap-1.5">
        {/* Save icon — independent of applied state */}
        <button
          type="button"
          onClick={toggleSaved}
          aria-label={flags.saved ? 'Unsave job' : 'Save job'}
          aria-pressed={flags.saved}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
            flags.saved
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
          }`}
        >
          <Bookmark className="h-4 w-4" fill={flags.saved ? 'currentColor' : 'none'} />
        </button>
        {/* Hide icon — only show when not applied (applied jobs don't make sense to hide) */}
        {!flags.applied && (
          <button
            type="button"
            onClick={hide}
            aria-label="Hide job"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <EyeOff className="h-4 w-4" />
          </button>
        )}
        {/* Applied badge or Apply button */}
        {flags.applied ? (
          <div className="ml-1 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
            <Check className="h-3.5 w-3.5" />
            Applied
          </div>
        ) : (
          <button
            type="button"
            onClick={openApplyModal}
            className="ml-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-600"
          >
            Apply
          </button>
        )}
      </div>
      <ApplyModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        jobId={jobId}
        jobTitle={jobTitle}
        company={company}
        applyUrl={applyUrl}
        onApplied={onApplied}
      />
    </>
  )
}
