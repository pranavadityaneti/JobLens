// src/components/filters/per-page-selector.tsx
'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PER_PAGE_OPTIONS } from '@/lib/job-filters'

type Props = {
  value: number
  onChange: (perPage: number) => void
}

export function PerPageSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-600">
      <span>Per page</span>
      <Select
        value={String(value)}
        onValueChange={(v) => {
          if (typeof v === 'string') {
            const n = Number(v)
            if (!Number.isNaN(n)) onChange(n)
          }
        }}
      >
        <SelectTrigger className="min-w-[72px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PER_PAGE_OPTIONS.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
