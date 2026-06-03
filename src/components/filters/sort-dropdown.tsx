// src/components/filters/sort-dropdown.tsx
'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SORT_OPTIONS, type SortKey } from '@/lib/job-filters'

type Props = {
  value: SortKey
  onChange: (sort: SortKey) => void
}

export function SortDropdown({ value, onChange }: Props) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (typeof v === 'string') onChange(v as SortKey)
      }}
    >
      <SelectTrigger className="min-w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
