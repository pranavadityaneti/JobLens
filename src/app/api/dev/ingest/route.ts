// src/app/api/dev/ingest/route.ts
// Dev-only POST endpoint to trigger a full source ingestion from curl/HTTPie
// while logged into the app. Auth-gated indirectly through the same Supabase
// session check inside ingestAllSources, AND by the project's proxy.ts which
// redirects unauthenticated traffic to /login before this route runs.
//
// Example:
//   curl -X POST http://localhost:3000/api/dev/ingest \
//     --cookie "sb-access-token=…; sb-refresh-token=…"

import { NextResponse } from 'next/server'
import { ingestAllSources } from '@/app/(app)/actions'

export async function POST() {
  const result = await ingestAllSources()
  return NextResponse.json(result)
}
