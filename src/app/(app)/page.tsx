// src/app/(app)/page.tsx
import { getSupabaseServer } from '@/lib/supabase/server'

export default async function JobsPage() {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const phoneDisplay = user?.phone ? `+${user.phone}` : 'Unknown'

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950">
          Jobs
        </h1>
        <p className="mt-2 text-zinc-500">
          Your personalized job feed lands here in Sessions 4–6.
        </p>
      </header>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          Signed in as
        </p>
        <p className="mt-2 text-lg font-semibold text-zinc-950">
          {phoneDisplay}
        </p>
      </div>
    </div>
  )
}
