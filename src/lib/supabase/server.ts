// src/lib/supabase/server.ts
// Server-side Supabase client. Reads + sets the auth session cookie.
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getSupabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(toSet) {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Cookies can only be set in Server Actions / Route Handlers,
            // not in Server Components. Silently no-op when called from RSC.
          }
        },
      },
    },
  )
}
