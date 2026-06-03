# JobLens MVP — Design Spec

**Working name:** JobLens (open to rename)
**Date:** 2026-06-03
**Status:** Approved — moving to execution (Session 2)
**Author:** Claude (Opus 4.7) with founder direction (Pranav)

---

## Changelog

- **v3 (2026-06-03):** Replaced anonymous auth with WhatsApp OTP login via Wati. Per-user identity tied to phone number from day one. Dropped Apify cost-cap enforcement at founder direction — log spend for visibility but don't gate.
- **v2 (2026-06-03):** Removed login UI; added multi-source aggregation, cross-source dedup, share-a-job. ~16 sessions.
- **v1 (2026-06-03):** Initial draft — single-source Adzuna + email/Google login.

---

## 1. What MVP is — and is NOT

**MVP user journey.** An Indian white-collar job seeker visits JobLens. To use save/track/AI features they enter their WhatsApp phone number, receive a 6-digit OTP on WhatsApp via Wati, enter it, and they're logged in. They see a unified, deduplicated feed pulled from many sources: Adzuna India, Greenhouse/Lever/Ashby ATS feeds, and Apify-scraped Naukri/LinkedIn/Indeed. They mark jobs Saved/Applied/Hidden — Applied/Hidden disappear. They upload a resume, get an AI score + section feedback, and see a match percentage on every job. They open a job and (rate-limited) get tailored AI suggestions. They can copy a link or share to WhatsApp/email.

**MVP scope — IN:**
- **WhatsApp OTP authentication via Wati.** Phone-only identity. No email, no Google, no password.
- **Multi-source job ingestion:** Adzuna India, Greenhouse, Lever, Ashby, plus Naukri/LinkedIn/Indeed via Apify.
- **Cross-source deduplication** (hash-based).
- Feed with filters (keyword, location, date posted, source).
- Per-user state: Saved / Applied / Hidden.
- Resume upload (PDF/DOCX), parsed to text.
- Resume score (one Claude Sonnet 4.6 call).
- Resume-job match score on every job (Voyage embeddings + pgvector).
- Per-job tailoring suggestions, capped at 3 fresh/user/day, cached forever per (resume, job).
- Share features: copy link / WhatsApp / email.
- Deployed at `joblens.vercel.app`.

**MVP scope — OUT (deferred to v0.2+, tracked in `forlater.md`):**
- Email + Google login as alternative auth methods
- Multiple resumes per user; resume version history
- Email digests; job alert subscriptions
- Mobile app
- Employer/company profile pages
- True referral attribution
- Custom domain
- Embedding-similarity dedup
- International phone numbers (MVP is India-only)

---

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router) | Full-stack TypeScript, server actions |
| Language | **TypeScript** | One language end-to-end |
| UI | **Tailwind CSS + shadcn/ui** | Free, copy-paste, clean defaults |
| DB | **Supabase Postgres** | Free tier; auth + storage + pgvector in one project |
| Auth identity | **Supabase Auth** (admin-created phone users) | Issues session JWTs; we drive user creation via Admin API |
| Auth OTP delivery | **Wati WhatsApp Business API** | Founder-provided; sends OTP template via WhatsApp |
| File storage | **Supabase Storage** | Resumes |
| Vector store | **pgvector** inside Supabase | No separate service |
| LLM | **Claude Sonnet 4.6** | Resume scoring + tailoring |
| Embeddings | **Voyage AI** (`voyage-3-large`) | Anthropic-aligned, cheap |
| Hosting | **Vercel** | Native Next.js, free tier |
| Cron | **Vercel Cron** | Daily source pulls |
| Resume parsing | `pdf-parse` + `mammoth` | Free libs |
| Apify | Per-source actors | Naukri/LinkedIn/Indeed |
| Source control | **GitHub** | Standard |

**Costs:** Per founder direction, not optimizing for the prior $30/month ceiling — focus is end-to-end integration first. `apify_spend_log` table logs spend for visibility; tuning happens after we observe real costs.

---

## 3. Architecture

```
[ User browser ]
       │
       ▼
[ Next.js on Vercel ] ─── server actions ───→ [ Supabase Postgres + pgvector ]
       │                                              ▲
       ├─ Wati API (OTP send via WhatsApp) ───────────│
       ├─ Supabase Auth Admin (createUser, sessions) ─┤
       ├─ Supabase Storage (resume files)             │
       ├─ Anthropic (Claude Sonnet 4.6)               │
       └─ Voyage AI (embeddings)                      │
                                                      │
[ Vercel Cron — daily ]                               │
   ├─ /api/cron/adzuna       → Adzuna API ────────────┤
   ├─ /api/cron/greenhouse   → Greenhouse boards ─────┤
   ├─ /api/cron/lever        → Lever postings ────────┤
   ├─ /api/cron/ashby        → Ashby boards ──────────┤
   ├─ /api/cron/apify-naukri   → Apify actor ─────────┤
   ├─ /api/cron/apify-linkedin → Apify actor ─────────┤
   └─ /api/cron/apify-indeed   → Apify actor ─────────┤

[ /api/cron/dedup ── runs after ingest ── canonical_id linking ]
```

**WhatsApp OTP auth flow:**
```
User enters +91-9XXXXXXXXX
   │
   ▼
server action: validate format; generate 6-digit OTP; bcrypt hash;
              insert into otp_requests (phone, otp_hash, expires_at = now + 5 min)
              call Wati API to send template
   │
   ▼
Wati → user's WhatsApp: "Your JobLens OTP is 123456. Valid 5 min."
   │
   ▼
User enters 6-digit OTP in UI
   │
   ▼
server action: look up latest otp_request for phone where expires_at > now
              increment attempts; if attempts > 5 → reject (lock 1 hr)
              bcrypt.compare(input, otp_hash)
       │
       ├─ no existing user with this phone:
       │     supabase.auth.admin.createUser({ phone, phone_confirm: true })
       │     insert profile row
       │
       └─ existing user found:
             supabase.auth.admin.generateLink({ type: 'magiclink', email: ... })
             or use admin signInWithUserId equivalent
   │
   ▼
server: set HTTP-only auth cookie with session
   │
   ▼
client: authenticated; subsequent server-action / RLS-protected calls work normally
```

---

## 4. Data model

**`profiles`** (extends Supabase `auth.users`)
- `id` (FK auth.users.id, PK)
- `phone` (text, UNIQUE, indexed) — E.164 format, e.g. `+919876543210`
- `created_at`, `updated_at`
- `daily_tailoring_count`, `daily_tailoring_reset_at`

**`otp_requests`** (transient)
- `id` (PK), `phone` (text, indexed)
- `otp_hash` (text — bcrypt)
- `expires_at` (timestamp — 5 min after creation)
- `attempts` (int default 0)
- `created_at`
- Cleanup: cron deletes rows where `expires_at < now() - interval '1 hour'`

**`resumes`** — unchanged from v2

**`jobs`** — unchanged from v2 (`canonical_id`, `dedup_hash`)

**`user_jobs`** — unchanged from v2

**`tailoring_suggestions`** — unchanged from v2

**`apify_spend_log`** — unchanged from v2 (now visibility-only, no gating)

---

## 5. AI strategy (unchanged from v2)

A. Resume score — one Claude call per upload. ~$0.05/upload.
B. Match score — Voyage embeddings + pgvector cosine. < $1/month.
C. Tailoring — Claude call, cached per (resume, job), 3 fresh/user/day, midnight IST reset.

---

## 6. Cross-source dedup (unchanged from v2)

Hash-based: normalize company + title + location → SHA hash → canonical_id. Source precedence: ATS > Adzuna > Apify-scraped.

---

## 7. Sessions roadmap

~16 sessions to MVP. Session 3 is now WhatsApp OTP auth.

- **Session 1 (today):** Design spec + decisions. ✅
- **Session 2 (next):** Setup — accounts (GitHub, Supabase, Vercel, Anthropic, Voyage, Adzuna, Apify, Wati). Submit Wati OTP template for Meta approval (early — takes days). Scaffold Next.js + Tailwind + shadcn. Push to GitHub. Hello-world deployed to Vercel. git init.
- **Session 3:** WhatsApp OTP auth — phone input UI, OTP input UI, Wati integration, otp_requests table, Supabase Admin createUser, session issuance, protected routes.
- **Session 4:** Adzuna ingestion — schema, manual fetch, render list. Establishes ingestion pattern.
- **Session 5:** Vercel Cron daily Adzuna pull. Idempotent inserts.
- **Session 6:** Feed UI proper — filters, pagination, card design.
- **Session 7:** Saved / Applied / Hidden — buttons, state, feed filtering.
- **Session 8:** Resume upload — file picker, Supabase Storage, parse.
- **Session 9:** Resume score — Claude call, structured response, display.
- **Session 10:** Embeddings + match — Voyage wired, embed jobs + resumes, match score, sort.
- **Session 11:** Per-job tailoring — detail page, button, cached LLM call, rate limit.
- **Session 12:** Free ATS sources — Greenhouse + Lever + Ashby.
- **Session 13:** Cross-source dedup.
- **Session 14:** Apify Naukri integration + spend logging.
- **Session 15:** Apify LinkedIn + Indeed integrations.
- **Session 16:** Share features + error states + final polish + deploy MVP.

---

## 8. Risks

- **Wati template approval delay.** WhatsApp Business templates require Meta approval (1–3 days). *Mitigation:* submit template in Session 2 so it's approved by Session 3.
- **Wati account state.** Founder needs an active Wati subscription with a registered WhatsApp Business sender number. *Mitigation:* confirm before Session 3.
- **Phone format edge cases.** Indian numbers come in many forms (+91, 91, 09, raw 10-digit). *Mitigation:* normalize to E.164 on entry; reject non-Indian numbers in MVP.
- **OTP brute force.** *Mitigation:* 5-attempt lockout per phone/hour, 5-minute OTP expiry, bcrypt hashing.
- **Cost surprises (Apify + Anthropic).** Per founder direction, validate the integration first; tune costs after.
- **Cross-source dedup quality** (unchanged from v2).
- **Apify actor instability** (unchanged from v2).
- **Vercel/Supabase free-tier limits** (unchanged from v2).
- **Resume parsing quality** (unchanged from v2).

---

## 9. Open decisions / confirmations

- **WhatsApp OTP via Wati** — confirmed by founder.
- **Email + Google login** — deferred to v0.2.
- **Apify cost gating** — relaxed; log only.
- **Sonnet now, Opus later** — confirmed.
- **Voyage for embeddings** — confirmed.
- **India-only phone numbers in MVP** — assumed; flag if you want otherwise.
- **OTP message template wording** — to be drafted in Session 2 and submitted via Wati for Meta approval.
