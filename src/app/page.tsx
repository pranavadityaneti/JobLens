// src/app/page.tsx
import { getSupabaseServer } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold">JobLens</h1>
      <p className="mt-4 text-muted-foreground">
        Signed in as <span className="font-medium">{user?.phone ?? 'unknown'}</span>.
      </p>
      <p className="mt-2 text-sm">
        (Feed UI lands in Session 6.)
      </p>
    </main>
  )
}
