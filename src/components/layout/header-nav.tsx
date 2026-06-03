// src/components/layout/header-nav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Jobs', href: '/' },
  { label: 'Saved', href: '/saved' },
  { label: 'Applied', href: '/applied' },
  { label: 'Resume', href: '/resume' },
] as const

export function HeaderNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1 h-16">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex h-16 items-center border-b-2 px-3 text-sm font-medium transition-colors ${
              isActive
                ? 'border-emerald-500 text-zinc-950'
                : 'border-transparent text-zinc-600 hover:text-zinc-950'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
