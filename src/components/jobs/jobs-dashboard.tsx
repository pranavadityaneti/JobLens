// src/components/jobs/jobs-dashboard.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { JobCard } from './job-card'
import { JobDetailSheet } from './job-detail-sheet'
import type { JobDetailData } from './job-detail'
import { ActiveFilterChips } from '@/components/filters/active-filter-chips'
import { FilterSidebar } from '@/components/filters/filter-sidebar'
import { PerPageSelector } from '@/components/filters/per-page-selector'
import { SortDropdown } from '@/components/filters/sort-dropdown'
import {
  DEFAULT_PER_PAGE,
  PER_PAGE_OPTIONS,
  serializeFilters,
  type FilterState,
} from '@/lib/job-filters'
import type { UserJobFlags } from '@/lib/user-jobs'

// Inlined to avoid pulling next/headers into a client module.
const NO_FLAGS: UserJobFlags = { saved: false, applied: false, hidden: false }

export type DashboardJob = JobDetailData & {
  source: string
  source_id?: string
}

type Props = {
  filters: FilterState
  jobs: DashboardJob[]
  flagsRecord: Record<string, UserJobFlags>
  industryOptions: readonly string[]
  error: string | null
}

const SIDE_STORAGE_KEY = 'joblens:sidebarSide'
type SidebarSide = 'left' | 'right'

function readStoredSide(): SidebarSide {
  if (typeof window === 'undefined') return 'left'
  try {
    const v = window.localStorage.getItem(SIDE_STORAGE_KEY)
    return v === 'right' ? 'right' : 'left'
  } catch {
    return 'left'
  }
}

export function JobsDashboard({
  filters,
  jobs,
  flagsRecord,
  industryOptions,
  error,
}: Props) {
  const router = useRouter()

  // Sidebar side — read from localStorage on mount, persist on toggle.
  // Default to 'left' for SSR; the swap happens after hydration so the
  // markup stays stable.
  const [side, setSide] = useState<SidebarSide>('left')
  useEffect(() => {
    setSide(readStoredSide())
  }, [])

  const toggleSide = useCallback(() => {
    setSide((prev) => {
      const next: SidebarSide = prev === 'left' ? 'right' : 'left'
      try {
        window.localStorage.setItem(SIDE_STORAGE_KEY, next)
      } catch {
        // ignore — non-critical preference
      }
      return next
    })
  }, [])

  // Detail drawer state
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? jobs.find((j) => j.id === selectedId) ?? null : null
  const selectedFlags = selected ? flagsRecord[selected.id] ?? NO_FLAGS : NO_FLAGS

  // Patch URL with new filter values. When any *filtering* field changes,
  // reset perPage to the default so the user doesn't end up paginated past
  // a now-shorter result set.
  const onPatch = useCallback(
    (partial: Partial<FilterState>) => {
      const next: FilterState = { ...filters, ...partial }

      // If the *filter* changed (vs sort or perPage), reset perPage to
      // default so the load-more buffer doesn't carry over stale state.
      const filterFieldChanged = Object.keys(partial).some((k) =>
        k !== 'sort' && k !== 'perPage',
      )
      if (filterFieldChanged && partial.perPage == null) {
        next.perPage = DEFAULT_PER_PAGE
      }

      const sp = serializeFilters(next)
      const qs = sp.toString()
      router.replace(qs ? `/?${qs}` : '/', { scroll: false })
    },
    [filters, router],
  )

  const loadMore = useCallback(() => {
    // Next bump above current page size. If we're already at the top, no-op.
    const idx = PER_PAGE_OPTIONS.indexOf(filters.perPage)
    if (idx === -1) {
      onPatch({ perPage: DEFAULT_PER_PAGE })
      return
    }
    const nextIdx = Math.min(idx + 1, PER_PAGE_OPTIONS.length - 1)
    if (nextIdx === idx) return
    onPatch({ perPage: PER_PAGE_OPTIONS[nextIdx] })
  }, [filters.perPage, onPatch])

  const canLoadMore =
    jobs.length >= filters.perPage && filters.perPage < PER_PAGE_OPTIONS[PER_PAGE_OPTIONS.length - 1]

  // Build a short, human-readable summary of the active filter context for
  // the result count line ("247 jobs · Bengaluru · Senior").
  const summaryBits: string[] = []
  if (filters.locations.length > 0) summaryBits.push(filters.locations.join(', '))
  if (filters.experience.length > 0) summaryBits.push(filters.experience.join(', '))
  if (filters.workModels.length > 0) summaryBits.push(filters.workModels.join(', '))

  const sidebar = (
    <FilterSidebar
      filters={filters}
      industryOptions={industryOptions}
      side={side}
      onSideToggle={toggleSide}
      onPatch={onPatch}
    />
  )

  const main = (
    <div className="min-w-0 flex-1">
      {/* Top bar: search summary + sort */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Jobs</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {jobs.length > 0
              ? `Showing ${jobs.length} job${jobs.length === 1 ? '' : 's'}${
                  summaryBits.length > 0 ? ' · ' + summaryBits.join(' · ') : ''
                }`
              : 'No jobs match your filters.'}
          </p>
        </div>
        <SortDropdown
          value={filters.sort}
          onChange={(sort) => onPatch({ sort })}
        />
      </div>

      <ActiveFilterChips filters={filters} onPatch={onPatch} />

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load jobs: {error}
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h2 className="text-base font-semibold text-zinc-900">No matching jobs</h2>
          <p className="mt-1.5 text-sm text-zinc-500">
            Try widening your filters or clearing them.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              flags={flagsRecord[job.id] ?? NO_FLAGS}
              onSelect={() => setSelectedId(job.id)}
            />
          ))}
        </div>
      )}

      {/* Footer: per-page + load more */}
      <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PerPageSelector
          value={filters.perPage}
          onChange={(perPage) => onPatch({ perPage })}
        />
        {canLoadMore && (
          <button
            type="button"
            onClick={loadMore}
            className="self-end rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Load more
          </button>
        )}
      </div>

      <JobDetailSheet
        job={selected}
        flags={selectedFlags}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      />
    </div>
  )

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div
        className={`flex flex-col gap-6 md:flex-row ${
          side === 'right' ? 'md:flex-row-reverse' : ''
        }`}
      >
        {sidebar}
        {main}
      </div>
    </div>
  )
}
