// src/components/filters/active-filter-chips.tsx
'use client'

import { X } from 'lucide-react'
import {
  DATE_OPTIONS,
  isFilterEmpty,
  type FilterState,
} from '@/lib/job-filters'
import type { ExperienceBucket, WorkModel } from '@/lib/job-text'

type Props = {
  filters: FilterState
  onPatch: (partial: Partial<FilterState>) => void
}

type Chip = { key: string; label: string; clear: () => Partial<FilterState> }

function formatSalaryShort(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(n % 10_000_000 === 0 ? 0 : 1)}Cr`
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(n % 100_000 === 0 ? 0 : 1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}k`
  return `₹${n}`
}

export function ActiveFilterChips({ filters, onPatch }: Props) {
  if (isFilterEmpty(filters)) return null

  const chips: Chip[] = []

  if (filters.q) {
    chips.push({
      key: `q:${filters.q}`,
      label: `Search: "${filters.q}"`,
      clear: () => ({ q: '' }),
    })
  }
  for (const loc of filters.locations) {
    chips.push({
      key: `loc:${loc}`,
      label: loc,
      clear: () => ({ locations: filters.locations.filter((x) => x !== loc) }),
    })
  }
  if (filters.date !== 'all') {
    const lab = DATE_OPTIONS.find((o) => o.value === filters.date)?.label ?? filters.date
    chips.push({
      key: `date:${filters.date}`,
      label: lab,
      clear: () => ({ date: 'all' }),
    })
  }
  if (filters.salaryMin != null || filters.salaryMax != null) {
    const lo = filters.salaryMin != null ? formatSalaryShort(filters.salaryMin) : '₹0'
    const hi = filters.salaryMax != null ? formatSalaryShort(filters.salaryMax) : '∞'
    chips.push({
      key: 'salary',
      label: `${lo} – ${hi}`,
      clear: () => ({ salaryMin: null, salaryMax: null }),
    })
  }
  for (const ind of filters.industries) {
    chips.push({
      key: `ind:${ind}`,
      label: ind,
      clear: () => ({ industries: filters.industries.filter((x) => x !== ind) }),
    })
  }
  for (const c of filters.contractTypes) {
    chips.push({
      key: `ctype:${c}`,
      label: c,
      clear: () => ({ contractTypes: filters.contractTypes.filter((x) => x !== c) }),
    })
  }
  for (const wm of filters.workModels) {
    chips.push({
      key: `wm:${wm}`,
      label: wm,
      clear: () => ({
        workModels: filters.workModels.filter((x) => x !== (wm as WorkModel)),
      }),
    })
  }
  for (const exp of filters.experience) {
    chips.push({
      key: `exp:${exp}`,
      label: exp,
      clear: () => ({
        experience: filters.experience.filter((x) => x !== (exp as ExperienceBucket)),
      }),
    })
  }
  for (const s of filters.skills) {
    chips.push({
      key: `skill:${s}`,
      label: s,
      clear: () => ({ skills: filters.skills.filter((x) => x !== s) }),
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onPatch(c.clear())}
          className="group/chip inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
        >
          <span className="truncate max-w-[180px]">{c.label}</span>
          <X className="h-3 w-3 text-zinc-400 group-hover/chip:text-zinc-600" />
        </button>
      ))}
      <button
        type="button"
        onClick={() =>
          onPatch({
            q: '',
            locations: [],
            industries: [],
            contractTypes: [],
            workModels: [],
            experience: [],
            skills: [],
            date: 'all',
            salaryMin: null,
            salaryMax: null,
          })
        }
        className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
      >
        Clear all
      </button>
    </div>
  )
}
