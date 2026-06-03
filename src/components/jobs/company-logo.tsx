// src/components/jobs/company-logo.tsx
'use client'

import { useState } from 'react'

/**
 * Best-effort guess at a company's domain from its name.
 * Strips common legal suffixes, punctuation, and whitespace, then appends .com.
 * Works for ~30-50% of companies — the rest fall back to the initial avatar.
 */
function guessDomain(name: string): string {
  const stripped = name
    .toLowerCase()
    .replace(
      /\b(private\s+limited|pvt\.?\s*ltd\.?|pvt\.?|ltd\.?|llp|inc\.?|corp\.?|corporation|limited|llc|gmbh|co\.?|plc)\b/gi,
      '',
    )
    .replace(/[^a-z0-9]/g, '')
  return `${stripped}.com`
}

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

type Size = 'sm' | 'lg'

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-12 w-12 rounded-xl text-lg',
  lg: 'h-16 w-16 rounded-2xl text-2xl',
}

export function CompanyLogo({
  company,
  size = 'sm',
}: {
  company: string
  size?: Size
}) {
  const [errored, setErrored] = useState(false)
  const domain = guessDomain(company)

  if (errored || !domain || domain === '.com') {
    return (
      <div
        className={`flex flex-shrink-0 items-center justify-center bg-emerald-100 font-semibold text-emerald-700 ${SIZE_CLASSES[size]}`}
        aria-label={`${company} logo`}
      >
        <span>{initial(company)}</span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={`${company} logo`}
      onError={() => setErrored(true)}
      className={`flex-shrink-0 border border-zinc-200 bg-white object-contain p-1.5 ${SIZE_CLASSES[size]}`}
    />
  )
}
