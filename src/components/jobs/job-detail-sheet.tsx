// src/components/jobs/job-detail-sheet.tsx
'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { UserJobState } from '@/lib/user-jobs'
import { JobDetail, type JobDetailData } from './job-detail'

type Props = {
  job: JobDetailData | null
  userState: UserJobState | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function JobDetailSheet({ job, userState, open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[80vw] sm:max-w-4xl flex flex-col gap-0 p-6"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{job?.title ?? 'Job details'}</SheetTitle>
        </SheetHeader>
        {job && <JobDetail job={job} userState={userState} />}
      </SheetContent>
    </Sheet>
  )
}
