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
import { setUserJobFlagAction } from '@/app/(app)/actions'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  jobTitle: string
  company: string
  applyUrl: string
  onApplied?: () => void
}

export function ApplyModal({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  company,
  applyUrl,
  onApplied,
}: Props) {
  const [isPending, startTransition] = useTransition()

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await setUserJobFlagAction(jobId, 'applied', true)
      window.open(applyUrl, '_blank', 'noopener,noreferrer')
      if (result.ok) {
        onApplied?.()
        onOpenChange(false)
      } else {
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
