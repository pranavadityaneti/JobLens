// src/components/jobs/ingest-button.tsx
'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { ingestAdzunaJobs } from '@/app/(app)/actions'
import { Button } from '@/components/ui/button'

export function IngestButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const handleClick = () => {
    setMessage(null)
    startTransition(async () => {
      const result = await ingestAdzunaJobs()
      if (result.ok) {
        setMessage({
          kind: 'ok',
          text: `Added ${result.inserted} new job${result.inserted === 1 ? '' : 's'} (${result.skipped} already seen) of ${result.count} total available.`,
        })
        router.refresh()
      } else {
        setMessage({ kind: 'err', text: result.error })
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={handleClick} disabled={isPending} variant="outline">
        <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
        {isPending ? 'Fetching…' : 'Fetch latest from Adzuna'}
      </Button>
      {message && (
        <p
          className={`text-xs ${
            message.kind === 'ok' ? 'text-emerald-700' : 'text-red-600'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}
