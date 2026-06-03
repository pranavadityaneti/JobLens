# JobLens

Unified Indian job aggregation + AI resume coaching. A web app that pulls jobs from many sources into one feed, remembers what you've applied to so you don't re-see jobs, and provides free job-specific AI resume feedback.

**Status:** Pre-MVP. Session 2 (setup) in progress. See [`docs/specs/`](docs/specs/) for the design and [`docs/plans/`](docs/plans/) for the session-by-session roadmap.

## Links

- **Design spec:** [`docs/specs/2026-06-03-mvp-design.md`](docs/specs/2026-06-03-mvp-design.md)
- **Deferred work queue:** [`forlater.md`](forlater.md)
- **Current session plan:** [`docs/plans/2026-06-03-session-2-setup.md`](docs/plans/2026-06-03-session-2-setup.md)

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres + Auth + Storage + pgvector) · Vercel · Anthropic Claude Sonnet · Voyage AI embeddings · Wati WhatsApp OTP

## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in real secrets — see Wati/Supabase/etc. accounts
npm run dev
```

Open http://localhost:3000.

## Project conventions

- Specs live in `docs/specs/YYYY-MM-DD-<topic>-design.md`
- Session plans live in `docs/plans/YYYY-MM-DD-session-<n>-<topic>.md`
- Work consciously deferred goes in `forlater.md` (read at the start of every session)
- `.env.local` holds real secrets and is git-ignored; `.env.local.example` is the committed template
