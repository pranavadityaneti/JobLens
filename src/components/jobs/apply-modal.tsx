// src/components/jobs/apply-modal.tsx
'use client'

import { useTransition } from 'react'
import { ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { setUserJobState } from '@/app/(app)/actions'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  jobTitle: string
  company: string
  applyUrl: string
}

export function ApplyModal({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  company,
  applyUrl,
}: Props) {
  const [isPending, startTransition] = useTransition()

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await setUserJobState(jobId, 'applied')
      // Open in new tab regardless of state-set success — user wants to apply
      // even if our bookkeeping fails.
      window.open(applyUrl, '_blank', 'noopener,noreferrer')
      if (result.ok) {
        onOpenChange(false)
      } else {
        // On the rare failure, leave modal open so user sees the error.
        // (Real errors here are likely network or auth; we surface them
        // unobtrusively.)
        console.error('Failed to mark applied:', result.error)
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply to {jobTitle}?</DialogTitle>
          <DialogDescription className="pt-1">
            We&apos;ll open the application page for {company} in a new tab and
            mark this job as <span className="font-medium text-zinc-900">Applied</span> so you can track it.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            <ExternalLink className="h-4 w-4" />
            {isPending ? 'Opening…' : 'Continue to application'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
