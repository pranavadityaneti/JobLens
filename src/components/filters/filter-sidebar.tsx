// src/components/filters/filter-sidebar.tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, ChevronRight, X } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  CONTRACT_TYPE_OPTIONS,
  DATE_OPTIONS,
  EXPERIENCE_OPTIONS,
  FUNCTION_GROUPS,
  LOCATION_OPTIONS,
  SALARY_SLIDER_MAX,
  SALARY_SLIDER_MIN,
  SALARY_SLIDER_STEP,
  WORK_MODEL_OPTIONS,
  type DateBucket,
  type FilterState,
} from '@/lib/job-filters'
import type { ExperienceBucket, WorkModel } from '@/lib/job-text'

type SidebarSide = 'left' | 'right'

type Props = {
  filters: FilterState
  side: SidebarSide
  onSideToggle: () => void
  onPatch: (partial: Partial<FilterState>) => void
}

const SECTION_VALUES = [
  'search',
  'location',
  'date',
  'salary',
  'function',
  'contract',
  'workmodel',
  'experience',
  'skills',
] as const
type SectionValue = (typeof SECTION_VALUES)[number]

// Top 3 sections open by default per spec
const DEFAULT_OPEN_SECTIONS: SectionValue[] = ['location', 'date', 'salary']

// Pretty-format salaries shown above the slider handles (e.g. ₹50L, ₹5L)
function formatSalary(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(n % 10_000_000 === 0 ? 0 : 1)}Cr`
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(n % 100_000 === 0 ? 0 : 1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}k`
  return `₹${n}`
}

export function FilterSidebar({
  filters,
  side,
  onSideToggle,
  onPatch,
}: Props) {
  // Debounced inputs (search + skills + slider) need local state so each
  // keystroke / drag doesn't push a new URL.
  const [qLocal, setQLocal] = useState(filters.q)
  const [skillInput, setSkillInput] = useState('')
  const [sliderLocal, setSliderLocal] = useState<[number, number]>([
    filters.salaryMin ?? SALARY_SLIDER_MIN,
    filters.salaryMax ?? SALARY_SLIDER_MAX,
  ])

  // Keep local state in sync if URL is changed elsewhere (chips, clear all).
  // We don't sync from URL on every render — only when the underlying
  // filter value actually changes.
  useEffect(() => {
    setQLocal(filters.q)
  }, [filters.q])
  useEffect(() => {
    setSliderLocal([
      filters.salaryMin ?? SALARY_SLIDER_MIN,
      filters.salaryMax ?? SALARY_SLIDER_MAX,
    ])
  }, [filters.salaryMin, filters.salaryMax])

  // Debounce the keyword search: push to URL 350ms after the last keystroke.
  const qDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (qLocal === filters.q) return
    if (qDebounce.current) clearTimeout(qDebounce.current)
    qDebounce.current = setTimeout(() => onPatch({ q: qLocal }), 350)
    return () => {
      if (qDebounce.current) clearTimeout(qDebounce.current)
    }
  }, [qLocal, filters.q, onPatch])

  const toggleInArray = useCallback(
    <T extends string>(arr: T[], val: T): T[] =>
      arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val],
    [],
  )

  // Commit slider value to URL when the user releases the drag.
  const commitSalary = useCallback(
    (vals: [number, number]) => {
      const [lo, hi] = vals
      const min = lo > SALARY_SLIDER_MIN ? lo : null
      const max = hi < SALARY_SLIDER_MAX ? hi : null
      onPatch({ salaryMin: min, salaryMax: max })
    },
    [onPatch],
  )

  const addSkill = useCallback(
    (raw: string) => {
      const parts = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (parts.length === 0) return
      const next = Array.from(new Set([...filters.skills, ...parts]))
      onPatch({ skills: next })
      setSkillInput('')
    },
    [filters.skills, onPatch],
  )

  const removeSkill = useCallback(
    (s: string) => {
      onPatch({ skills: filters.skills.filter((x) => x !== s) })
    },
    [filters.skills, onPatch],
  )

  const hasAny =
    !!filters.q ||
    filters.locations.length > 0 ||
    filters.subRoles.length > 0 ||
    filters.contractTypes.length > 0 ||
    filters.workModels.length > 0 ||
    filters.experience.length > 0 ||
    filters.skills.length > 0 ||
    filters.date !== 'all' ||
    filters.salaryMin != null ||
    filters.salaryMax != null

  const clearAll = useCallback(() => {
    onPatch({
      q: '',
      locations: [],
      subRoles: [],
      contractTypes: [],
      workModels: [],
      experience: [],
      skills: [],
      date: 'all',
      salaryMin: null,
      salaryMax: null,
    })
    setQLocal('')
    setSliderLocal([SALARY_SLIDER_MIN, SALARY_SLIDER_MAX])
  }, [onPatch])

  // Function-section local state: which parent groups are expanded. Empty
  // by default (all collapsed) — too many sub-roles to render everything up
  // front. Independent of the outer accordion's open/closed state.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const toggleGroup = useCallback((label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }, [])

  // Toggle ALL sub-roles in a group: if any are selected, clear them; else
  // add the full set. Mirrors a "parent checkbox" semantic.
  const toggleParent = useCallback(
    (groupSubs: string[]) => {
      const selectedSet = new Set(filters.subRoles)
      const anySelected = groupSubs.some((s) => selectedSet.has(s))
      if (anySelected) {
        // Clear all subs in this group
        const next = filters.subRoles.filter((s) => !groupSubs.includes(s))
        onPatch({ subRoles: next })
      } else {
        // Add all subs in this group
        const next = Array.from(new Set([...filters.subRoles, ...groupSubs]))
        onPatch({ subRoles: next })
      }
    },
    [filters.subRoles, onPatch],
  )

  return (
    <aside className="w-full shrink-0 md:w-72">
      {/* Header: side-swap + clear-all */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onSideToggle}
          aria-label={`Move filter sidebar to the ${side === 'left' ? 'right' : 'left'}`}
          title={`Move filter sidebar to the ${side === 'left' ? 'right' : 'left'}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
        </button>
        {hasAny ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
          >
            Clear all
          </button>
        ) : (
          <span className="text-xs font-medium text-zinc-400">No filters</span>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <Accordion multiple defaultValue={DEFAULT_OPEN_SECTIONS as string[]}>
          {/* 1. Search */}
          <AccordionItem value="search">
            <AccordionTrigger>Search</AccordionTrigger>
            <AccordionContent>
              <Input
                type="text"
                value={qLocal}
                onChange={(e) => setQLocal(e.target.value)}
                placeholder="Title or keyword…"
                className="w-full"
              />
            </AccordionContent>
          </AccordionItem>

          {/* 2. Location */}
          <AccordionItem value="location">
            <AccordionTrigger>Location</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-2">
                {LOCATION_OPTIONS.map((loc) => {
                  const checked = filters.locations.includes(loc)
                  return (
                    <label
                      key={loc}
                      className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) =>
                          onPatch({
                            locations: next
                              ? [...filters.locations, loc]
                              : filters.locations.filter((x) => x !== loc),
                          })
                        }
                      />
                      <span>{loc}</span>
                    </label>
                  )
                })}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 3. Date posted */}
          <AccordionItem value="date">
            <AccordionTrigger>Date posted</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-2">
                {DATE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700"
                  >
                    <input
                      type="radio"
                      name="date-bucket"
                      value={opt.value}
                      checked={filters.date === opt.value}
                      onChange={() => onPatch({ date: opt.value as DateBucket })}
                      className="h-4 w-4 cursor-pointer accent-emerald-600"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 4. Salary */}
          <AccordionItem value="salary">
            <AccordionTrigger>Salary range</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-3 pt-1">
                <div className="flex items-center justify-between text-xs text-zinc-600">
                  <span>{formatSalary(sliderLocal[0])}</span>
                  <span>{formatSalary(sliderLocal[1])}</span>
                </div>
                <Slider
                  min={SALARY_SLIDER_MIN}
                  max={SALARY_SLIDER_MAX}
                  step={SALARY_SLIDER_STEP}
                  value={sliderLocal}
                  onValueChange={(v) => {
                    if (Array.isArray(v) && v.length === 2) {
                      setSliderLocal([v[0] as number, v[1] as number])
                    }
                  }}
                  onValueCommitted={(v) => {
                    if (Array.isArray(v) && v.length === 2) {
                      commitSalary([v[0] as number, v[1] as number])
                    }
                  }}
                />
                {(filters.salaryMin != null || filters.salaryMax != null) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSliderLocal([SALARY_SLIDER_MIN, SALARY_SLIDER_MAX])
                      onPatch({ salaryMin: null, salaryMax: null })
                    }}
                    className="self-start text-xs font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    Reset salary
                  </button>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 5. Function (hierarchical: 15 parent groups × ~100 sub-roles) */}
          <AccordionItem value="function">
            <AccordionTrigger>Function</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
                {FUNCTION_GROUPS.map((group) => {
                  const subs = group.subRoles
                  const selectedSet = new Set(filters.subRoles)
                  const selectedInGroup = subs.filter((s) => selectedSet.has(s))
                  const allSelected = selectedInGroup.length === subs.length
                  const someSelected = selectedInGroup.length > 0 && !allSelected
                  const expanded = expandedGroups.has(group.label)
                  return (
                    <div key={group.label} className="py-0.5">
                      <div className="flex items-center gap-1.5 text-sm text-zinc-800">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.label)}
                          aria-label={expanded ? `Collapse ${group.label}` : `Expand ${group.label}`}
                          aria-expanded={expanded}
                          className="inline-flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:text-zinc-900"
                        >
                          <ChevronRight
                            className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
                          />
                        </button>
                        <label className="flex flex-1 cursor-pointer items-center gap-2">
                          <Checkbox
                            checked={allSelected}
                            indeterminate={someSelected}
                            onCheckedChange={() => toggleParent(subs)}
                          />
                          <span className={`truncate ${someSelected || allSelected ? 'font-medium text-zinc-900' : ''}`}>
                            {group.label}
                          </span>
                          {selectedInGroup.length > 0 && (
                            <span className="ml-auto text-xs text-zinc-500">
                              {selectedInGroup.length}/{subs.length}
                            </span>
                          )}
                        </label>
                      </div>
                      {expanded && (
                        <div className="ml-7 mt-1 flex flex-col gap-1.5">
                          {subs.map((sub) => {
                            const checked = selectedSet.has(sub)
                            return (
                              <label
                                key={sub}
                                className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(next) =>
                                    onPatch({
                                      subRoles: next
                                        ? [...filters.subRoles, sub]
                                        : filters.subRoles.filter((x) => x !== sub),
                                    })
                                  }
                                />
                                <span className="truncate">{sub}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 6. Contract type */}
          <AccordionItem value="contract">
            <AccordionTrigger>Contract type</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-2">
                {CONTRACT_TYPE_OPTIONS.map((c) => {
                  const checked = filters.contractTypes.includes(c)
                  return (
                    <label
                      key={c}
                      className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) =>
                          onPatch({
                            contractTypes: next
                              ? [...filters.contractTypes, c]
                              : filters.contractTypes.filter((x) => x !== c),
                          })
                        }
                      />
                      <span>{c}</span>
                    </label>
                  )
                })}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 7. Work model */}
          <AccordionItem value="workmodel">
            <AccordionTrigger>Work model</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-2">
                {WORK_MODEL_OPTIONS.map((wm) => {
                  const checked = filters.workModels.includes(wm)
                  return (
                    <label
                      key={wm}
                      className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) =>
                          onPatch({
                            workModels: next
                              ? [...filters.workModels, wm as WorkModel]
                              : filters.workModels.filter((x) => x !== wm),
                          })
                        }
                      />
                      <span>{wm}</span>
                    </label>
                  )
                })}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 8. Experience */}
          <AccordionItem value="experience">
            <AccordionTrigger>Experience</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-2">
                {EXPERIENCE_OPTIONS.map((exp) => {
                  const checked = filters.experience.includes(exp)
                  return (
                    <label
                      key={exp}
                      className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) =>
                          onPatch({
                            experience: next
                              ? [...filters.experience, exp as ExperienceBucket]
                              : filters.experience.filter((x) => x !== exp),
                          })
                        }
                      />
                      <span>{exp}</span>
                    </label>
                  )
                })}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 9. Skills */}
          <AccordionItem value="skills">
            <AccordionTrigger>Skills</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-2">
                <Input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addSkill(skillInput)
                    }
                  }}
                  placeholder="e.g. React, TypeScript"
                />
                {filters.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {filters.skills.map((s) => (
                      <Button
                        key={s}
                        variant="secondary"
                        size="xs"
                        onClick={() => removeSkill(s)}
                        className="gap-1"
                      >
                        {s}
                        <X className="h-3 w-3" />
                      </Button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-zinc-500">Press Enter or comma to add.</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </aside>
  )
}

// re-export so other components can keep prop-types tight without importing
// straight from the lib (and so we have a single export surface for the
// sidebar's "side" type).
export type { SidebarSide }
