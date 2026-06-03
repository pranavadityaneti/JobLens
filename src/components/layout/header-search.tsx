// src/components/layout/header-search.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'

export function HeaderSearch() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      setValue('')
    }
  }

  return (
    <div
      className={`flex h-10 items-center overflow-hidden rounded-full bg-zinc-100 transition-all duration-300 ease-out ${
        open ? 'w-72' : 'w-10'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close search' : 'Open search'}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center text-zinc-600 transition-colors hover:text-zinc-950"
      >
        <Search className="h-4 w-4" />
      </button>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!value) setOpen(false)
        }}
        placeholder="Search jobs…"
        className={`flex-1 bg-transparent pr-4 text-sm text-zinc-900 outline-none placeholder:text-zinc-500 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
    </div>
  )
}
