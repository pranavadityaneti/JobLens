# Session 3 Implementation Plan — WhatsApp OTP Auth via Wati

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** End-to-end WhatsApp OTP login. Visitor goes to `/login`, types their phone, receives a 6-digit OTP on WhatsApp via Wati, enters it, and is authenticated with a Supabase session. Test phone `+919959777027` accepts a hard-coded OTP `123456` (bypasses Wati) so we can develop and demo without burning real WhatsApp messages.

**Architecture:**
- Two-step UI flow: phone input → OTP input (single page that swaps state).
- OTP is generated server-side, bcrypt-hashed, stored in `otp_requests` with 5-minute expiry, max 5 attempts.
- Real OTPs send via Wati's WhatsApp template `otp`. The test phone bypasses Wati entirely and accepts the hard-coded value.
- On verify, we call Supabase Auth Admin to find-or-create a user by phone, then set an auth-session cookie.
- A `proxy.ts` (Next.js 16's renamed middleware) enforces auth on every route except `/login`.

**Tech Stack:** Next.js 16 App Router · Supabase Auth Admin API · Wati WhatsApp API · `@supabase/ssr` · bcryptjs · zod · Vitest + Testing Library.

**Two roles:**
- `[Founder]` — Pranav does this in his browser (Supabase dashboard, Vercel, test phone).
- `[Claude]` — Claude runs this via Bash / Edit / Write in the project.

**Important Next.js 16 changes (post training cutoff):**
- `middleware.ts` → `proxy.ts` (same purpose, new name + same exports).
- `cookies()` from `next/headers` is now async: `const c = await cookies()`.
- These are reflected throughout the plan.

---

## File map

**To create:**
- `vitest.config.ts` — Vitest config
- `src/test/setup.ts` — Testing Library setup
- `src/lib/supabase/server.ts` — server-side Supabase client with cookie handling
- `src/lib/supabase/admin.ts` — admin Supabase client (service role)
- `src/lib/supabase/client.ts` — browser-side Supabase client
- `src/lib/phone.ts` — Indian phone normalization to E.164
- `src/lib/phone.test.ts`
- `src/lib/otp.ts` — generate, hash, compare OTPs
- `src/lib/otp.test.ts`
- `src/lib/wati.ts` — Wati API client (sendOtp)
- `src/lib/wati.test.ts`
- `src/app/(auth)/login/page.tsx` — login UI (phone → OTP)
- `src/app/(auth)/login/actions.ts` — `requestOtp` + `verifyOtp` server actions
- `src/proxy.ts` — auth proxy (replaces middleware in Next 16)
- `supabase/migrations/20260603_init_auth_tables.sql` — DB schema

**To modify:**
- `package.json` — new deps
- `.env.local` + `.env.local.example` — add `TEST_PHONE_NUMBER` + `TEST_OTP`
- `src/app/page.tsx` — show authenticated state or redirect to login

---

### Task 1: Install dependencies `[Claude]`

**Files:**
- Modify: `package.json` and `package-lock.json`

- [ ] **Step 1:** Install runtime dependencies (Supabase SSR helper + admin SDK, bcrypt, zod):
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  npm install @supabase/ssr @supabase/supabase-js bcryptjs zod
  ```
- [ ] **Step 2:** Install dev dependencies (testing):
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @types/bcryptjs
  ```
- [ ] **Step 3:** Verify both installs succeeded:
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  grep -E '"(@supabase/ssr|@supabase/supabase-js|bcryptjs|zod|vitest|@testing-library/react|jsdom)"' package.json
  ```
  Expected: all 7 packages listed.

**Acceptance:** `package.json` lists all 7 new packages.

---

### Task 2: Configure Vitest `[Claude]`

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Modify: `package.json` (add `test` and `test:watch` scripts)

- [ ] **Step 1:** Create `vitest.config.ts` at project root:
  ```ts
  // vitest.config.ts
  import { defineConfig } from 'vitest/config'
  import react from '@vitejs/plugin-react'
  import path from 'node:path'

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      globals: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  })
  ```
- [ ] **Step 2:** Create `src/test/setup.ts`:
  ```ts
  // src/test/setup.ts
  import '@testing-library/jest-dom/vitest'
  ```
- [ ] **Step 3:** Add scripts to `package.json`. Edit the `scripts` block so it includes:
  ```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  }
  ```
- [ ] **Step 4:** Write a smoke test to verify Vitest works. Create `src/test/smoke.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest'

  describe('vitest setup', () => {
    it('runs', () => {
      expect(1 + 1).toBe(2)
    })
  })
  ```
- [ ] **Step 5:** Run tests:
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  npm test
  ```
  Expected: 1 test passes.

**Acceptance:** `npm test` runs and reports 1 passing test.

---

### Task 3: Database migration — `profiles` + `otp_requests` tables `[Claude writes SQL, Founder applies via dashboard]`

**Files:**
- Create: `supabase/migrations/20260603_init_auth_tables.sql`

- [ ] **Step 1:** Create the directory and SQL file. Write to `supabase/migrations/20260603_init_auth_tables.sql`:
  ```sql
  -- JobLens — initial auth tables
  -- Creates: profiles (extends auth.users), otp_requests (transient OTP storage)
  -- Run in Supabase SQL Editor.

  -- ============================================================
  -- profiles: per-user data linked to auth.users
  -- ============================================================
  create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    phone text not null unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    daily_tailoring_count int not null default 0,
    daily_tailoring_reset_at timestamptz not null default now()
  );

  create index profiles_phone_idx on public.profiles(phone);

  alter table public.profiles enable row level security;

  -- Users can read their own profile
  create policy "profiles_select_own"
    on public.profiles for select
    using (auth.uid() = id);

  -- Users can update their own profile
  create policy "profiles_update_own"
    on public.profiles for update
    using (auth.uid() = id);

  -- Server-side admin inserts only (no client insert policy = blocked)

  -- ============================================================
  -- otp_requests: short-lived OTP records
  -- ============================================================
  create table public.otp_requests (
    id uuid primary key default gen_random_uuid(),
    phone text not null,
    otp_hash text not null,
    expires_at timestamptz not null,
    attempts int not null default 0,
    created_at timestamptz not null default now()
  );

  create index otp_requests_phone_idx on public.otp_requests(phone);
  create index otp_requests_expires_at_idx on public.otp_requests(expires_at);

  alter table public.otp_requests enable row level security;
  -- No policies = no client access; only service_role can read/write.

  -- ============================================================
  -- Trigger: keep profiles.updated_at fresh
  -- ============================================================
  create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
  as $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$;

  create trigger profiles_set_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();
  ```
- [ ] **Step 2 [Founder]:** Open the Supabase dashboard for the `joblens` project → SQL Editor → New query. Paste the entire contents of the file above. Click "Run".
  Expected: "Success. No rows returned."
- [ ] **Step 3 [Founder]:** Verify tables exist. In Table Editor (sidebar), confirm `profiles` and `otp_requests` appear under `public`. Tell Claude in chat when done.

**Acceptance:** Both tables present in Supabase; SQL file committed in repo.

---

### Task 4: Supabase clients `[Claude]`

**Files:**
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`
- Create: `src/lib/supabase/client.ts`

- [ ] **Step 1:** Create `src/lib/supabase/server.ts` (server-side reader, ties session cookie):
  ```ts
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
  ```
- [ ] **Step 2:** Create `src/lib/supabase/admin.ts` (server-only admin client with service_role):
  ```ts
  // src/lib/supabase/admin.ts
  // Admin client — bypasses RLS. NEVER expose to the browser.
  import { createClient } from '@supabase/supabase-js'

  export function getSupabaseAdmin() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    )
  }
  ```
- [ ] **Step 3:** Create `src/lib/supabase/client.ts` (browser-side client):
  ```ts
  // src/lib/supabase/client.ts
  // Browser-side Supabase client. Safe for the public anon key.
  import { createBrowserClient } from '@supabase/ssr'

  export function getSupabaseBrowser() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  ```

**Acceptance:** Three files created; project still builds (`npm run build` succeeds — we'll verify at the end).

---

### Task 5: Phone normalization (`src/lib/phone.ts`) — TDD `[Claude]`

**Files:**
- Create: `src/lib/phone.ts`
- Create: `src/lib/phone.test.ts`

- [ ] **Step 1: Write the failing tests.** Create `src/lib/phone.test.ts`:
  ```ts
  // src/lib/phone.test.ts
  import { describe, it, expect } from 'vitest'
  import { normalizeIndianPhone } from './phone'

  describe('normalizeIndianPhone', () => {
    it('accepts a bare 10-digit Indian number and adds +91', () => {
      expect(normalizeIndianPhone('9959777027')).toBe('+919959777027')
    })

    it('accepts an "091" prefix and converts to E.164', () => {
      expect(normalizeIndianPhone('09959777027')).toBe('+919959777027')
    })

    it('accepts "+91 99597 77027" with spaces', () => {
      expect(normalizeIndianPhone('+91 99597 77027')).toBe('+919959777027')
    })

    it('accepts "91-9959777027" with hyphen', () => {
      expect(normalizeIndianPhone('91-9959777027')).toBe('+919959777027')
    })

    it('rejects numbers that are too short', () => {
      expect(normalizeIndianPhone('99597')).toBeNull()
    })

    it('rejects numbers that are too long', () => {
      expect(normalizeIndianPhone('+919959777027000')).toBeNull()
    })

    it('rejects empty string', () => {
      expect(normalizeIndianPhone('')).toBeNull()
    })

    it('rejects null/undefined', () => {
      expect(normalizeIndianPhone(null as unknown as string)).toBeNull()
      expect(normalizeIndianPhone(undefined as unknown as string)).toBeNull()
    })

    it('rejects letters', () => {
      expect(normalizeIndianPhone('99597abc27')).toBeNull()
    })
  })
  ```
- [ ] **Step 2: Run to confirm failure:**
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  npm test -- phone.test
  ```
  Expected: tests fail with "Cannot find module './phone'".
- [ ] **Step 3: Implement.** Create `src/lib/phone.ts`:
  ```ts
  // src/lib/phone.ts
  // Normalize Indian phone numbers to E.164 (+91XXXXXXXXXX).
  // Returns null for invalid input. MVP is India-only.

  export function normalizeIndianPhone(input: string): string | null {
    if (typeof input !== 'string' || input.length === 0) return null

    // Strip everything except digits
    const digits = input.replace(/\D/g, '')

    // Indian mobile numbers are 10 digits. With country code: 12 digits (91XXXXXXXXXX).
    // Allow leading 0 (e.g. "09959777027" — 11 digits, the leading 0 is local dial)
    let phone10: string | null = null

    if (digits.length === 10) {
      phone10 = digits
    } else if (digits.length === 11 && digits.startsWith('0')) {
      phone10 = digits.slice(1)
    } else if (digits.length === 12 && digits.startsWith('91')) {
      phone10 = digits.slice(2)
    } else {
      return null
    }

    // Indian mobile numbers start with 6, 7, 8, or 9
    if (!/^[6-9]\d{9}$/.test(phone10)) return null

    return `+91${phone10}`
  }
  ```
- [ ] **Step 4: Run tests to confirm pass:**
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  npm test -- phone.test
  ```
  Expected: all 9 tests pass.

**Acceptance:** All phone tests pass.

---

### Task 6: OTP utilities (`src/lib/otp.ts`) — TDD `[Claude]`

**Files:**
- Create: `src/lib/otp.ts`
- Create: `src/lib/otp.test.ts`

- [ ] **Step 1: Write the failing tests.** Create `src/lib/otp.test.ts`:
  ```ts
  // src/lib/otp.test.ts
  import { describe, it, expect } from 'vitest'
  import { generateOtp, hashOtp, compareOtp } from './otp'

  describe('generateOtp', () => {
    it('returns a 6-digit string', () => {
      const otp = generateOtp()
      expect(otp).toMatch(/^\d{6}$/)
    })

    it('returns different values on subsequent calls', () => {
      const otps = new Set()
      for (let i = 0; i < 20; i++) otps.add(generateOtp())
      // 20 calls should produce at least 15 distinct values (allow a few collisions)
      expect(otps.size).toBeGreaterThan(15)
    })
  })

  describe('hashOtp / compareOtp', () => {
    it('hashes an OTP and the hash matches on compare', async () => {
      const otp = '123456'
      const hash = await hashOtp(otp)
      expect(hash).not.toBe(otp)
      expect(await compareOtp(otp, hash)).toBe(true)
    })

    it('compare returns false for the wrong OTP', async () => {
      const hash = await hashOtp('123456')
      expect(await compareOtp('999999', hash)).toBe(false)
    })

    it('produces different hashes for the same input (salt)', async () => {
      const a = await hashOtp('123456')
      const b = await hashOtp('123456')
      expect(a).not.toBe(b)
    })
  })
  ```
- [ ] **Step 2: Run to confirm failure:**
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  npm test -- otp.test
  ```
  Expected: tests fail with "Cannot find module './otp'".
- [ ] **Step 3: Implement.** Create `src/lib/otp.ts`:
  ```ts
  // src/lib/otp.ts
  // OTP generation and bcrypt-backed verification.
  import bcrypt from 'bcryptjs'

  /** Generate a 6-digit numeric OTP as a zero-padded string. */
  export function generateOtp(): string {
    const n = Math.floor(Math.random() * 1_000_000)
    return n.toString().padStart(6, '0')
  }

  /** Bcrypt hash an OTP (cost 10). */
  export async function hashOtp(otp: string): Promise<string> {
    return bcrypt.hash(otp, 10)
  }

  /** Constant-time compare via bcrypt. */
  export async function compareOtp(otp: string, hash: string): Promise<boolean> {
    return bcrypt.compare(otp, hash)
  }
  ```
- [ ] **Step 4: Run tests to confirm pass:**
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  npm test -- otp.test
  ```
  Expected: all 5 tests pass.

**Acceptance:** All OTP tests pass.

---

### Task 7: Wati API client (`src/lib/wati.ts`) — TDD `[Claude]`

**Files:**
- Create: `src/lib/wati.ts`
- Create: `src/lib/wati.test.ts`

Wati's "Send Template Message" endpoint is `POST {WATI_API_BASE_URL}/api/v1/sendTemplateMessage?whatsappNumber={phone}` with body containing `template_name` and `broadcast_name` and `parameters`. Reference: Wati API documentation.

- [ ] **Step 1: Write the failing tests.** Create `src/lib/wati.test.ts`:
  ```ts
  // src/lib/wati.test.ts
  import { describe, it, expect, vi, beforeEach } from 'vitest'
  import { sendOtpViaWati } from './wati'

  describe('sendOtpViaWati', () => {
    beforeEach(() => {
      vi.stubEnv('WATI_API_KEY', 'test-key')
      vi.stubEnv('WATI_API_BASE_URL', 'https://example.wati.io/12345')
      vi.stubEnv('WATI_OTP_TEMPLATE_NAME', 'otp')
    })

    it('calls Wati Send Template endpoint with correct payload', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ result: true }), { status: 200 }),
      )

      await sendOtpViaWati('+919876543210', '123456')

      expect(fetchSpy).toHaveBeenCalledOnce()
      const [url, init] = fetchSpy.mock.calls[0]
      expect(url).toContain('https://example.wati.io/12345/api/v1/sendTemplateMessage')
      expect(url).toContain('whatsappNumber=919876543210') // strips '+', keeps digits
      expect((init as RequestInit).method).toBe('POST')
      expect((init as RequestInit).headers).toMatchObject({
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      })
      const body = JSON.parse((init as RequestInit).body as string)
      expect(body.template_name).toBe('otp')
      expect(body.parameters).toEqual([{ name: '1', value: '123456' }])
    })

    it('throws on non-OK response', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('Unauthorized', { status: 401 }),
      )
      await expect(sendOtpViaWati('+919876543210', '123456')).rejects.toThrow(/Wati/)
    })

    it('throws when Wati responds with result:false', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ result: false, info: 'rejected' }), { status: 200 }),
      )
      await expect(sendOtpViaWati('+919876543210', '123456')).rejects.toThrow(/rejected/)
    })
  })
  ```
- [ ] **Step 2: Run to confirm failure:**
  ```bash
  npm test -- wati.test
  ```
  Expected: tests fail with module-not-found.
- [ ] **Step 3: Implement.** Create `src/lib/wati.ts`:
  ```ts
  // src/lib/wati.ts
  // Wati WhatsApp API client — send OTP via the approved template.
  // Endpoint: POST {base}/api/v1/sendTemplateMessage?whatsappNumber={digits}
  //   - phone: digits only, no '+' (Wati strips it server-side anyway)
  //   - body: { template_name, broadcast_name, parameters: [{ name, value }] }

  export async function sendOtpViaWati(
    phoneE164: string,
    otp: string,
  ): Promise<void> {
    const base = process.env.WATI_API_BASE_URL
    const key = process.env.WATI_API_KEY
    const templateName = process.env.WATI_OTP_TEMPLATE_NAME

    if (!base || !key || !templateName) {
      throw new Error('Wati env vars missing (BASE_URL / API_KEY / TEMPLATE_NAME)')
    }

    const digits = phoneE164.replace(/\D/g, '')
    const url = `${base}/api/v1/sendTemplateMessage?whatsappNumber=${digits}`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_name: templateName,
        broadcast_name: 'joblens_otp',
        parameters: [{ name: '1', value: otp }],
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>')
      throw new Error(`Wati request failed: ${res.status} ${text}`)
    }

    const json = (await res.json()) as { result?: boolean; info?: string }
    if (json.result === false) {
      throw new Error(`Wati rejected message: ${json.info ?? 'unknown'}`)
    }
  }
  ```
- [ ] **Step 4: Run tests to confirm pass:**
  ```bash
  npm test -- wati.test
  ```
  Expected: all 3 tests pass.

**Acceptance:** All Wati tests pass.

---

### Task 8: `requestOtp` server action `[Claude]`

**Files:**
- Create: `src/app/(auth)/login/actions.ts` (starts with `requestOtp`; `verifyOtp` added in Task 9)

- [ ] **Step 1:** Create the directory and the actions file. Write `src/app/(auth)/login/actions.ts`:
  ```ts
  // src/app/(auth)/login/actions.ts
  'use server'

  import { z } from 'zod'
  import { normalizeIndianPhone } from '@/lib/phone'
  import { generateOtp, hashOtp } from '@/lib/otp'
  import { sendOtpViaWati } from '@/lib/wati'
  import { getSupabaseAdmin } from '@/lib/supabase/admin'

  /**
   * Request OTP for a phone number.
   * - Validates and normalizes the phone (Indian E.164).
   * - If the phone matches TEST_PHONE_NUMBER, skips Wati but still stores a
   *   record (with the TEST_OTP value) so verify path is consistent.
   * - Otherwise generates an OTP, stores its hash, sends via Wati.
   */
  export async function requestOtp(formData: FormData): Promise<
    { ok: true; phone: string } | { ok: false; error: string }
  > {
    const raw = formData.get('phone')
    const parsed = z.string().min(1).safeParse(raw)
    if (!parsed.success) return { ok: false, error: 'Phone is required.' }

    const phone = normalizeIndianPhone(parsed.data)
    if (!phone) return { ok: false, error: 'Enter a valid Indian mobile number.' }

    const supabase = getSupabaseAdmin()

    // Test bypass: hard-coded OTP for a fixed test phone.
    const isTestPhone = phone === process.env.TEST_PHONE_NUMBER
    const otp = isTestPhone ? (process.env.TEST_OTP ?? '123456') : generateOtp()

    const otpHash = await hashOtp(otp)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 min

    const { error: insertErr } = await supabase
      .from('otp_requests')
      .insert({ phone, otp_hash: otpHash, expires_at: expiresAt })

    if (insertErr) {
      return { ok: false, error: 'Could not start login. Try again.' }
    }

    if (!isTestPhone) {
      try {
        await sendOtpViaWati(phone, otp)
      } catch (err) {
        // Surface failure to the user but keep details in server logs.
        console.error('Wati send failed', err)
        return { ok: false, error: 'Could not send WhatsApp OTP. Try again.' }
      }
    }

    return { ok: true, phone }
  }
  ```

**Acceptance:** File exists, imports resolve, no TypeScript errors.

> Note: deep TDD for server actions is awkward (they require a Supabase test instance). We exercise this path end-to-end in the smoke test (Task 14). Unit tests would be added in v0.2.

---

### Task 9: `verifyOtp` server action `[Claude]`

**Files:**
- Modify: `src/app/(auth)/login/actions.ts` (append `verifyOtp`)

- [ ] **Step 1:** Append `verifyOtp` to `src/app/(auth)/login/actions.ts`. Add these imports near the top (after the existing imports):
  ```ts
  import { compareOtp } from '@/lib/otp'
  import { redirect } from 'next/navigation'
  ```
  Then append at the bottom of the file:
  ```ts
  const MAX_ATTEMPTS = 5

  /**
   * Verify the OTP submitted by the user. On success, find-or-create the
   * Supabase auth user by phone and sign them in.
   */
  export async function verifyOtp(formData: FormData): Promise<
    { ok: false; error: string } | void
  > {
    const phoneRaw = formData.get('phone')
    const otpRaw = formData.get('otp')

    const phone = typeof phoneRaw === 'string' ? normalizeIndianPhone(phoneRaw) : null
    if (!phone) return { ok: false, error: 'Invalid phone.' }

    const otp = typeof otpRaw === 'string' ? otpRaw.trim() : ''
    if (!/^\d{6}$/.test(otp)) return { ok: false, error: 'Enter the 6-digit code.' }

    const supabase = getSupabaseAdmin()

    // Find the most recent unexpired OTP for this phone.
    const { data: rows, error: fetchErr } = await supabase
      .from('otp_requests')
      .select('id, otp_hash, expires_at, attempts')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)

    if (fetchErr || !rows || rows.length === 0) {
      return { ok: false, error: 'No active OTP. Request a new one.' }
    }
    const row = rows[0]

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false, error: 'Code expired. Request a new one.' }
    }

    if (row.attempts >= MAX_ATTEMPTS) {
      return { ok: false, error: 'Too many attempts. Try a new code.' }
    }

    // Increment attempts up-front (mitigates timing-based brute force).
    await supabase
      .from('otp_requests')
      .update({ attempts: row.attempts + 1 })
      .eq('id', row.id)

    const matched = await compareOtp(otp, row.otp_hash)
    if (!matched) return { ok: false, error: 'Incorrect code.' }

    // Burn the OTP — no replay.
    await supabase.from('otp_requests').delete().eq('id', row.id)

    // Find-or-create Supabase auth user by phone.
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .maybeSingle()

    let userId = existing?.id
    if (!userId) {
      const { data: created, error: createErr } =
        await supabase.auth.admin.createUser({
          phone: phone.replace('+', ''), // Supabase expects digits-only phone
          phone_confirm: true,
        })
      if (createErr || !created.user) {
        return { ok: false, error: 'Could not create account. Try again.' }
      }
      userId = created.user.id

      // Create the linked profile row.
      const { error: profileErr } = await supabase
        .from('profiles')
        .insert({ id: userId, phone })
      if (profileErr) {
        console.error('profile insert failed', profileErr)
        return { ok: false, error: 'Account created but profile setup failed.' }
      }
    }

    // Generate a session for the user. Supabase v2: use generateLink with magiclink
    // then trade for session OR use signInWithOtp under the hood. Simpler:
    // use admin to mint a session via createSession (newer API), else fall back to
    // the magiclink trick. We'll start with the recovery-link approach since it's
    // documented and stable.

    // For MVP, use the signing approach: create a custom session by setting
    // cookies via the server client. We'll use admin.generateLink to get a token
    // exchange URL, then call exchangeCodeForSession server-side.

    const { data: linkData, error: linkErr } =
      await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: `${userId}@phone.joblens.local`, // placeholder, never sent
      })

    // Note: phone-only auth in Supabase doesn't have a clean generateLink path.
    // If this branch errors, fall through to setting session manually via
    // updateUser + signInWithPassword pattern. For now keep this minimal.
    if (linkErr) {
      console.error('generateLink failed', linkErr)
      return { ok: false, error: 'Login session setup failed.' }
    }

    // The above is a sketch; real implementation may need to use
    // supabase.auth.admin.signIn or the cookie helper directly.
    // We'll iterate this in the smoke-test step if it fails in practice.

    redirect('/')
  }
  ```

> **Implementation caveat:** Supabase Auth's phone-only session creation via Admin API is in flux across versions. The skeleton above documents intent; during execution we will:
>  1. First try `supabase.auth.admin.createUser` then `supabase.auth.admin.generateLink` and trade the link for a session in our handler. If the Supabase JS version used doesn't expose `generateLink` for phone, fall back to the alternative path:
>  2. Alternative: use `supabase.auth.signInWithOtp({ phone })` from a server client — but this would re-trigger Supabase's own SMS provider, which we don't want.
>  3. Alternative 2: manually set the session cookie using `supabase.auth.setSession()` after computing JWT via service role.
>
> If we hit a wall, we add a fallback task: use Supabase's `admin.createUser` to create the user, then use a custom JWT signed with the JWT secret to issue our own session cookie. Document this choice when it lands.

**Acceptance:** File compiles; behavior to be validated in Task 14 (smoke test).

---

### Task 10: Login page UI `[Claude]`

**Files:**
- Create: `src/app/(auth)/login/page.tsx`

The page renders a single component that toggles between "phone input" and "OTP input" states based on a React state hook (client component).

- [ ] **Step 1:** Create `src/app/(auth)/login/page.tsx`:
  ```tsx
  // src/app/(auth)/login/page.tsx
  'use client'

  import { useState, useTransition } from 'react'
  import { Button } from '@/components/ui/button'
  import { Input } from '@/components/ui/input'
  import { requestOtp, verifyOtp } from './actions'

  type Step = 'phone' | 'otp'

  export default function LoginPage() {
    const [step, setStep] = useState<Step>('phone')
    const [phone, setPhone] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const handleRequestOtp = (formData: FormData) => {
      setError(null)
      startTransition(async () => {
        const result = await requestOtp(formData)
        if (result.ok) {
          setPhone(result.phone)
          setStep('otp')
        } else {
          setError(result.error)
        }
      })
    }

    const handleVerifyOtp = (formData: FormData) => {
      setError(null)
      // Ensure phone is included in the form payload
      formData.set('phone', phone)
      startTransition(async () => {
        const result = await verifyOtp(formData)
        // On success, verifyOtp redirects — we won't reach here.
        if (result && !result.ok) setError(result.error)
      })
    }

    return (
      <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-16">
        <header>
          <h1 className="text-2xl font-semibold">Sign in to JobLens</h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ll send a one-time code to your WhatsApp.
          </p>
        </header>

        {step === 'phone' && (
          <form action={handleRequestOtp} className="flex flex-col gap-3">
            <label htmlFor="phone" className="text-sm font-medium">
              WhatsApp number
            </label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              placeholder="9XXXXXXXXX"
              autoComplete="tel"
              required
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Sending…' : 'Send code'}
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form action={handleVerifyOtp} className="flex flex-col gap-3">
            <p className="text-sm">
              Code sent to <span className="font-medium">{phone}</span>.{' '}
              <button
                type="button"
                className="underline"
                onClick={() => {
                  setStep('phone')
                  setError(null)
                }}
              >
                Change number
              </button>
            </p>
            <label htmlFor="otp" className="text-sm font-medium">
              6-digit code
            </label>
            <Input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder="123456"
              autoComplete="one-time-code"
              required
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Verifying…' : 'Verify'}
            </Button>
          </form>
        )}

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </main>
    )
  }
  ```

**Acceptance:** Page renders; `npm run dev` and visit http://localhost:3000/login shows the form.

---

### Task 11: Proxy (Next 16's middleware) for protected routes `[Claude]`

**Files:**
- Create: `src/proxy.ts`

- [ ] **Step 1:** Create `src/proxy.ts`:
  ```ts
  // src/proxy.ts
  // Next.js 16 "proxy" (the renamed middleware) — runs before route render.
  // Redirects unauthenticated users away from protected routes to /login.
  // The /login page itself is public.
  import { NextResponse, type NextRequest } from 'next/server'
  import { createServerClient } from '@supabase/ssr'

  export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    if (pathname.startsWith('/login') || pathname.startsWith('/_next')) {
      return NextResponse.next()
    }

    // Build a Supabase client that uses request cookies for session lookup
    let response = NextResponse.next({ request })
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(toSet) {
            toSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            )
            response = NextResponse.next({ request })
            toSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            )
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    return response
  }

  export const config = {
    // Apply to everything except Next internals, static assets, and the favicon
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
  }
  ```

**Acceptance:** File created; `npm run build` succeeds; `/login` is reachable without a session; `/` redirects to `/login` when not signed in.

---

### Task 12: Update home page to show auth state `[Claude]`

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1:** Replace `src/app/page.tsx` contents with a minimal authenticated landing:
  ```tsx
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
  ```

**Acceptance:** Home page renders authed user's phone after login.

---

### Task 13: Add `TEST_PHONE_NUMBER` + `TEST_OTP` to env files `[Claude + Founder for Vercel]`

**Files:**
- Modify: `.env.local`
- Modify: `.env.local.example`

- [ ] **Step 1 [Claude]:** Append to `/Users/pranavaditya/projects/JobLens/.env.local.example`:
  ```
  
  # Test-mode bypass — phone matching TEST_PHONE_NUMBER skips Wati and accepts TEST_OTP
  TEST_PHONE_NUMBER=
  TEST_OTP=
  ```
- [ ] **Step 2 [Claude]:** Append to `/Users/pranavaditya/projects/JobLens/.env.local`:
  ```
  
  # Test-mode bypass
  TEST_PHONE_NUMBER=+919959777027
  TEST_OTP=123456
  ```
- [ ] **Step 3 [Founder]:** Add both to Vercel env vars (Project Settings → Environment Variables):
  - `TEST_PHONE_NUMBER` = `+919959777027`
  - `TEST_OTP` = `123456`
  - Apply to Production + Preview + Development.
  - Trigger a redeploy from Vercel UI so the new vars take effect.

**Acceptance:** Env vars present locally and on Vercel.

---

### Task 14: End-to-end smoke test `[Claude + Founder]`

- [ ] **Step 1 [Claude]:** Verify the project builds without errors:
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  npm run build 2>&1 | tail -30
  ```
  Expected: "Compiled successfully" (or Next.js 16 equivalent).
- [ ] **Step 2 [Claude]:** Run all unit tests:
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  npm test
  ```
  Expected: phone + otp + wati + smoke tests pass.
- [ ] **Step 3 [Founder]:** Start the dev server:
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  npm run dev
  ```
  Open http://localhost:3000 in browser. Expected: redirected to /login.
- [ ] **Step 4 [Founder, test-phone path]:** Enter `9959777027`, click "Send code", enter `123456`, click "Verify". Expected: redirected to / showing "Signed in as +919959777027".
- [ ] **Step 5 [Founder, real Wati path]:** Sign out (clear cookies in DevTools or use a private window). Enter your real WhatsApp number (different from the test number). Click "Send code". Expected: WhatsApp message arrives with a 6-digit code. Enter it. Expected: signed in screen.
- [ ] **Step 6 [Founder]:** If any step fails, paste the browser console error and the relevant server log (terminal where `npm run dev` is running) into chat. Claude debugs from there.

**Acceptance:** Both auth paths (test-phone bypass + real Wati) result in a signed-in landing page.

---

### Task 15: Commit + push `[Claude + Founder approval]`

**Files:** all of the above.

- [ ] **Step 1 [Claude]:** Stage everything:
  ```bash
  git -C /Users/pranavaditya/projects/JobLens add .
  git -C /Users/pranavaditya/projects/JobLens status
  ```
  Pause; show founder what's about to commit. Confirm `.env.local` is not staged.
- [ ] **Step 2 [Claude, after founder OK]:**
  ```bash
  git -C /Users/pranavaditya/projects/JobLens commit -m "$(cat <<'EOF'
  feat(auth): WhatsApp OTP login via Wati

  - profiles + otp_requests Supabase migration
  - server/admin/browser Supabase clients (@supabase/ssr)
  - Indian phone normalization (Indian E.164 only)
  - OTP generate + bcrypt hash + compare
  - Wati API client (sendTemplateMessage)
  - requestOtp + verifyOtp server actions, find-or-create user via admin API
  - /login two-step UI (phone → OTP), client form with useTransition
  - proxy.ts (Next 16) enforces auth on every route except /login
  - Test-phone bypass: TEST_PHONE_NUMBER / TEST_OTP env vars skip Wati
  - Vitest + Testing Library; unit tests for phone, otp, wati

  Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
  EOF
  )"
  git -C /Users/pranavaditya/projects/JobLens push
  ```
- [ ] **Step 3 [Founder]:** Wait ~1–2 min for Vercel to redeploy. Try the auth flow on the deployed URL. Confirm both paths work in production.

**Acceptance:** Auth works in production.

---

## End-of-session checklist

- [ ] Migrations applied to Supabase (`profiles` + `otp_requests` exist)
- [ ] All unit tests pass (`npm test` → green)
- [ ] `npm run build` succeeds
- [ ] Local: test-phone bypass works (`9959777027` + `123456` → signed in)
- [ ] Local: real Wati path works on a different number
- [ ] `proxy.ts` redirects unauthenticated users to `/login`
- [ ] Authenticated home page shows the user's phone
- [ ] All changes committed and pushed to `main`
- [ ] Vercel production deploy reflects new code
- [ ] Production: both auth paths verified

---

## Notes for Session 4 (next)

- Session 4 is **Adzuna ingestion** — schema for `jobs` table, manual fetch script, render basic list.
- Prerequisite: Founder creates Adzuna developer account (Task 6 of Session 2 plan) and adds `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` to `.env.local` and Vercel.
- Re-surface from `forlater.md`: nothing yet.

## Known risks / things that may break

- **Phone-only Supabase session minting via Admin API** (Task 9): the cleanest API path is in flux across `@supabase/supabase-js` versions. The plan documents intent; we adjust in flight if `admin.generateLink` doesn't behave as expected for phone-confirmed users. Backup: sign a custom JWT with the Supabase JWT secret and set the session cookie manually.
- **Wati phone format**: some Wati tenants want `whatsappNumber=919876543210` (digits only), others accept `+91...`. The client passes digits-only; if Wati rejects, swap to include the `+`.
- **OTP attempts counter is not per-hour-locked** — we increment but reset only on a new OTP request. Hour-window lockout is a v0.2 hardening.
- **No bot/abuse rate-limit** on phone-number entry. v0.2.
