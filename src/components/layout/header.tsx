// src/components/layout/header.tsx
import Link from 'next/link'
import { getSupabaseServer } from '@/lib/supabase/server'
import { HeaderNav } from './header-nav'
import { HeaderSearch } from './header-search'
import { AvatarMenu } from './avatar-menu'

export async function Header() {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const phoneDisplay = user?.phone ? `+${user.phone}` : 'Unknown'

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-6">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-zinc-950"
        >
          JobLens
        </Link>
        <div className="flex-1">
          <HeaderNav />
        </div>
        <div className="flex items-center gap-3">
          <HeaderSearch />
          <AvatarMenu phone={phoneDisplay} />
        </div>
      </div>
    </header>
  )
}
