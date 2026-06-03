# JobLens — Deferred Work Queue

Items consciously deferred. Read at session start; re-surface at natural phase breaks.

---

## Deferred from MVP design (2026-06-03, v3)

### v0.2 — Additional auth methods + account improvements
- [ ] Email + password login (alternative to WhatsApp OTP)
- [ ] Google OAuth (alternative)
- [ ] Change-phone-number flow
- [ ] Account settings UI (notifications, defaults)
- [ ] True referral attribution (who-referred-whom)

### v0.3 — Notifications
- [ ] Email digests (daily / weekly)
- [ ] Job alert subscriptions on saved searches
- [ ] WhatsApp digest via Wati (we already have it integrated)
- [ ] New high-match-score push notifications

### v0.4 — Smarter dedup + resume features
- [ ] Embedding-similarity dedup (catches semantic duplicates)
- [ ] Manual "these are not duplicates" feedback UI
- [ ] Cross-source field merge (best salary from one source, best description from another)
- [ ] Multiple resumes per user
- [ ] Resume version history
- [ ] "Compare two resumes against a job"

### v0.5 — Cost tuning + more sources
- [ ] Tune Apify per-source spend after observing real costs
- [ ] Re-introduce gating if budget pressure returns
- [ ] Additional sources (Glassdoor scraped, Hirist, Wellfound/AngelList)

### v0.6 — Mobile
- [ ] PWA polish (offline-ish behavior)
- [ ] Native mobile app (React Native, share TS code)

### Backlog (no version yet)
- [ ] Employer / company profile pages with aggregated job counts
- [ ] Company reviews integration
- [ ] Custom domain (currently `joblens.vercel.app`)
- [ ] Sonnet → Opus upgrade for resume scoring
- [ ] OpenAI embeddings swap if Voyage hits limits
- [ ] OCR for image-heavy PDFs
- [ ] Deep ATS-friendliness score
- [ ] Final product name
- [ ] International phone numbers (MVP is India-only)

---

## Recently moved INTO active scope (2026-06-03, v3)

- WhatsApp OTP authentication via Wati (replaces the anonymous-auth approach from v2)

## Recently moved OUT of active scope (2026-06-03, v3)

- Anonymous-then-upgrade auth path (v2 proposal) — superseded by phone auth from day one
- Apify daily-$ cap enforcement — replaced by spend logging only
- Email + Google OAuth (v2) — deferred to v0.2 as alternative auth methods

---

## Recently completed

- 2026-06-03: MVP design spec v3 approved.
