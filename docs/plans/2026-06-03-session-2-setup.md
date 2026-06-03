# Session 2 Implementation Plan — Project Setup & Hello-World Deploy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** From zero to a hello-world Next.js app deployed at a Vercel URL, with all third-party accounts created and secrets gathered. The plumbing is in place; Session 3 starts wiring features.

**Architecture:** Scaffold a Next.js 15 + TypeScript + Tailwind + shadcn/ui project, push to GitHub, connect Vercel for auto-deploy, submit the Wati OTP template for Meta approval (1–3 day lead time), and collect all third-party API keys into `.env.local` + Vercel env vars even for services we won't use until later sessions.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Supabase, Vercel, GitHub, Anthropic Claude, Voyage AI, Adzuna, Apify, Wati.

**Two roles in this plan:**
- `[Founder]` — Pranav does this in a browser or his terminal.
- `[Claude]` — Claude runs this via Bash in the project directory.

Note: this plan deviates from the standard write-test → implement → commit template because Session 2 is project setup, not feature code. Sessions 3+ will follow the TDD pattern.

---

### Task 1: Install local development tools `[Founder]`

You need Node.js (to run the app), git (to track code), and a code editor. We'll use Homebrew (Mac package manager) + nvm (Node Version Manager) for clean Node installation.

**Files:** none — system-level installations.

- [ ] **Step 1:** Open the macOS Terminal (Spotlight → "Terminal").
- [ ] **Step 2:** Check if Homebrew is installed:
  ```bash
  which brew
  ```
  If it prints a path like `/opt/homebrew/bin/brew`, skip to Step 3. If "not found":
  ```bash
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ```
  Follow the "Next steps" the installer prints (it'll show two `eval` lines to add to `~/.zprofile`).
- [ ] **Step 3:** Install nvm and Node.js 20 LTS:
  ```bash
  brew install nvm
  mkdir -p ~/.nvm
  ```
  Edit `~/.zshrc` (open with `code ~/.zshrc` or `nano ~/.zshrc`) and append these lines:
  ```bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
  ```
  Reload shell + install Node 20:
  ```bash
  source ~/.zshrc
  nvm install 20
  nvm alias default 20
  ```
  Verify: `node --version` shows `v20.x.x`.
- [ ] **Step 4:** Verify git:
  ```bash
  git --version
  ```
  If missing: `xcode-select --install` (installs Apple's command-line tools, which include git).
- [ ] **Step 5:** Install VS Code from https://code.visualstudio.com/. Open it → Cmd+Shift+P → type "Shell Command: Install 'code' command in PATH" → press Enter. Verify: `code --version`.

**Acceptance:** `node --version` returns v20.x, `git --version` works, `code --version` works.

---

### Task 2: Create GitHub account and repo `[Founder]`

GitHub stores your code. Vercel pulls from GitHub to deploy.

**Files:** none.

- [ ] **Step 1:** If you don't have a GitHub account, create one at https://github.com/signup.
- [ ] **Step 2:** Create a new repo at https://github.com/new:
  - Name: `joblens`
  - Description: `Unified Indian job aggregation + AI resume coaching`
  - Visibility: **Private**
  - Do NOT initialize with README, .gitignore, or license — Claude will create them locally.
  - Click "Create repository".
- [ ] **Step 3:** Copy the repo URL from the next page (HTTPS form, looks like `https://github.com/<your-username>/joblens.git`). Paste it into chat so Claude can use it in Task 10.
- [ ] **Step 4:** Set up GitHub authentication:
  ```bash
  brew install gh
  gh auth login
  ```
  Choose "GitHub.com" → "HTTPS" → "Login with a web browser" → follow prompts.
  Verify: `gh auth status` shows "Logged in".

**Acceptance:** Private `joblens` repo exists; `gh auth status` confirms login.

---

### Task 3: Create Supabase project `[Founder]`

Supabase will host the Postgres database, auth identity store, and file storage.

**Files:** none.

- [ ] **Step 1:** Sign up at https://supabase.com/dashboard/sign-up (use the same email or "Sign in with GitHub").
- [ ] **Step 2:** Click "New project":
  - Organization: your personal org (default)
  - Name: `joblens`
  - Database password: generate a strong one — **save it in a password manager**
  - Region: `Mumbai (Asia South 1)` (closest to your users)
  - Plan: Free
  - Click "Create new project"
- [ ] **Step 3:** Wait ~2 minutes for provisioning.
- [ ] **Step 4:** Collect three secrets from **Project Settings → API**:
  - `Project URL` → save as `SUPABASE_URL`
  - `anon public` key → save as `SUPABASE_ANON_KEY`
  - `service_role secret` key (click "Reveal" — keep this private) → save as `SUPABASE_SERVICE_ROLE_KEY`
- [ ] **Step 5:** Save these three values in a password manager. Also paste into chat so Claude can write `.env.local`.

**Acceptance:** Project provisioned, three secrets saved.

---

### Task 4: Create Vercel account and link to GitHub `[Founder]`

Vercel is where the app actually runs.

**Files:** none.

- [ ] **Step 1:** Sign up at https://vercel.com/signup → choose "Continue with GitHub" so they're linked from the start.
- [ ] **Step 2:** Authorize Vercel to access your GitHub repos. You can scope to "Only select repositories" → pick `joblens`, or grant access to all.
- [ ] **Step 3:** Don't import the repo yet — we'll do that in Task 11 once code exists.

**Acceptance:** Vercel account exists and linked to GitHub.

---

### Task 5: Create Anthropic + Voyage AI accounts `[Founder]`

These power the AI features (resume scoring, tailoring, embeddings).

**Files:** none.

- [ ] **Step 1: Anthropic**
  - Sign up at https://console.anthropic.com/login
  - Go to "API Keys" → "Create Key" → name it `joblens-dev`
  - Copy the key (starts with `sk-ant-...`) → save as `ANTHROPIC_API_KEY`
  - Go to "Plans & Billing" → add $20 of credits (one-time top-up; Claude Sonnet 4.6 is pay-as-you-go)
- [ ] **Step 2: Voyage AI**
  - Sign up at https://www.voyageai.com → it redirects to https://dashboard.voyageai.com
  - Generate an API key → save as `VOYAGE_API_KEY`
  - Free tier includes some credit; add $5–10 if you want margin.

**Acceptance:** Both API keys saved.

---

### Task 6: Create Adzuna developer account `[Founder]`

Adzuna provides the first (free) job source — the only one we wire up before Session 12.

**Files:** none.

- [ ] **Step 1:** Sign up at https://developer.adzuna.com/signup
- [ ] **Step 2:** Once logged in, the dashboard shows your `app_id` and `app_key`. Save as `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`.
- [ ] **Step 3:** Confirm India is supported (it is — Adzuna India uses `country=in` in their API).

**Acceptance:** Both Adzuna values saved.

---

### Task 7: Create Apify account `[Founder]`

Apify will scrape Naukri/LinkedIn/Indeed later in Session 14+. We collect credentials now for completeness.

**Files:** none.

- [ ] **Step 1:** Sign up at https://console.apify.com/sign-up
- [ ] **Step 2:** Go to "Settings" → "Integrations" → copy your API token → save as `APIFY_API_TOKEN`.

**Acceptance:** Apify token saved.

---

### Task 8: Confirm Wati state and submit OTP template `[Founder]`

This has the longest external lead time (Meta approval is 1–3 days). We submit the template in Session 2 so it's approved by Session 3.

**Files:** none.

- [ ] **Step 1:** Confirm your Wati subscription is active and you have a registered WhatsApp Business sender number. If not, complete that setup in the Wati dashboard before proceeding.
- [ ] **Step 2:** Get the Wati API access token: Wati dashboard → API Documentation → copy the Bearer token → save as `WATI_API_KEY`.
- [ ] **Step 3:** Note your Wati API base URL (looks like `https://live-server-XXXXX.wati.io`) → save as `WATI_API_BASE_URL`.
- [ ] **Step 4:** Submit the OTP template. In Wati: Templates → New Template:
  - Template name: `joblens_otp`
  - Category: `AUTHENTICATION`
  - Language: `English` (also add `English (UK)` if available)
  - Header: none
  - Body:
    ```
    {{1}} is your JobLens login code. Valid for 5 minutes. Do not share this code with anyone.
    ```
  - Footer: `JobLens`
  - No buttons, no media.
  - Submit for approval.
- [ ] **Step 5:** Save the template name (`joblens_otp`) and confirm the variable count (1) for use in Session 3. Approval status will appear in Wati's UI; check again in 1–3 days.

**Acceptance:** `WATI_API_KEY` + `WATI_API_BASE_URL` saved; template `joblens_otp` submitted for approval.

---

### Task 9: Scaffold the Next.js app `[Claude]`

Now we generate the project structure. Claude runs the commands; founder watches.

**Files:**
- Create: `/Users/pranavaditya/projects/JobLens/package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `components.json`, `src/lib/utils.ts`, `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, and the rest of the standard Next.js scaffold.

- [ ] **Step 1:** Run the Next.js scaffold:
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --yes
  ```
  Expected: scaffolded project with all standard files. The `--yes` flag accepts defaults non-interactively.
- [ ] **Step 2:** Verify the dev server runs locally:
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  npm run dev
  ```
  Expected: server starts on http://localhost:3000. Founder opens that URL → confirms the Next.js welcome page renders.
  Stop the server: Ctrl+C in the terminal.
- [ ] **Step 3:** Initialize shadcn/ui:
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  npx shadcn@latest init --yes -d
  ```
  Expected: `components.json` and `src/lib/utils.ts` created.
- [ ] **Step 4:** Install Button and Input shadcn components (we'll need them in Session 3 for the phone-input UI):
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  npx shadcn@latest add button input
  ```
  Expected: `src/components/ui/button.tsx` and `src/components/ui/input.tsx` created.

**Acceptance:** Dev server starts; Next.js welcome page loads at localhost:3000; shadcn components are present.

---

### Task 10: Initialize git, write env templates, push to GitHub `[Claude + Founder]`

**Files:**
- Create: `/Users/pranavaditya/projects/JobLens/.env.local.example`
- Verify (auto-created by Next.js): `/Users/pranavaditya/projects/JobLens/.gitignore` contains `.env*.local`

- [ ] **Step 1 [Claude]:** Initialize git in the project:
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  git init
  git branch -M main
  ```
  Expected: `.git/` directory created, branch is `main`.
- [ ] **Step 2 [Claude]:** Create `.env.local.example` with this exact content (variable names matching what we'll use throughout the project):
  ```
  # Supabase (NEXT_PUBLIC_ prefix = safe to expose to the browser;
  # service_role key stays server-only)
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=

  # AI providers (server-only)
  ANTHROPIC_API_KEY=
  VOYAGE_API_KEY=

  # Job sources (server-only)
  ADZUNA_APP_ID=
  ADZUNA_APP_KEY=
  APIFY_API_TOKEN=

  # WhatsApp auth via Wati (server-only)
  WATI_API_KEY=
  WATI_API_BASE_URL=
  WATI_OTP_TEMPLATE_NAME=
  ```
- [ ] **Step 3 [Claude]:** Verify `.gitignore` ignores `.env.local`. Read `/Users/pranavaditya/projects/JobLens/.gitignore` — it should contain a line matching `.env*.local`. If not, append:
  ```
  # local env files
  .env*.local
  ```
- [ ] **Step 4 [Founder]:** Create your real `.env.local`:
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  cp .env.local.example .env.local
  code .env.local
  ```
  Fill in the actual values from Tasks 3–8. **Never commit this file** — `.gitignore` should prevent it, but double-check.
- [ ] **Step 5 [Claude → Founder for approval]:** Stage everything and show the founder what's about to be committed:
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  git add .
  git status
  ```
  Expected `git status` output: `.env.local.example` is staged, `.env.local` is NOT (it's in `.gitignore`). Pause and have the founder confirm before committing.
- [ ] **Step 6 [Claude]:** After founder OK:
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  git commit -m "$(cat <<'EOF'
  Initial Next.js scaffold with Tailwind + shadcn/ui

  - Next.js 15 (App Router) + TypeScript
  - Tailwind CSS
  - shadcn/ui (Button, Input components)
  - .env.local.example template for all third-party secrets
  - Includes design spec (docs/specs/) and deferred work log (forlater.md)

  Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
  EOF
  )"
  ```
- [ ] **Step 7 [Founder]:** Provide the GitHub repo URL from Task 2 in chat. Then Claude runs:
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  git remote add origin <PASTE_URL_HERE>
  git push -u origin main
  ```
  Expected: push succeeds; `gh repo view` (or refreshing GitHub in the browser) shows the new commit.

**Acceptance:** Code on GitHub at the new repo URL; `.env.local` populated locally; `.env.local.example` committed.

---

### Task 11: Connect Vercel and deploy `[Founder + Claude]`

**Files:** Vercel env vars set via dashboard (no repo changes).

- [ ] **Step 1 [Founder]:** In Vercel dashboard, click "Add New..." → "Project" → import the `joblens` repo.
- [ ] **Step 2 [Founder]:** Framework preset auto-detects as Next.js. Leave Root directory `./`, build command and output directory at defaults.
- [ ] **Step 3 [Founder]:** Before clicking Deploy, expand "Environment Variables". Paste every key from `.env.local` (one row per variable: name + value). Including the ones we don't use until later sessions — they'll be ready when needed.
- [ ] **Step 4 [Founder]:** Click "Deploy". Wait ~1–2 minutes for the first build.
- [ ] **Step 5 [Founder]:** Once deployed, click the URL Vercel gives you (something like `joblens-<hash>.vercel.app`). You should see the Next.js welcome page. Tell Claude the URL in chat.
- [ ] **Step 6 [Founder]:** Optional but recommended: in the Vercel project → Settings → Domains, add `joblens.vercel.app` (free Vercel subdomain — first-come-first-served).

**Acceptance:** Hello-world is live at a Vercel URL.

---

### Task 12: Update README and commit `[Claude + Founder]`

**Files:**
- Modify: `/Users/pranavaditya/projects/JobLens/README.md`

- [ ] **Step 1 [Claude]:** Read the current `README.md` (auto-created by Next.js).
- [ ] **Step 2 [Claude]:** Replace its contents with project-relevant info. Write to `/Users/pranavaditya/projects/JobLens/README.md`:
  ```markdown
  # JobLens

  Unified Indian job aggregation + AI resume coaching.

  - **Spec:** [docs/specs/2026-06-03-mvp-design.md](docs/specs/2026-06-03-mvp-design.md)
  - **Deferred work log:** [forlater.md](forlater.md)
  - **Live:** _Deployed at Vercel — see Vercel dashboard for current URL._

  ## Local development

  ```bash
  npm install
  cp .env.local.example .env.local   # fill in real secrets
  npm run dev
  ```

  Visit http://localhost:3000.

  ## Status

  Pre-MVP. See `docs/specs/` for the design and `docs/plans/` for the session-by-session implementation roadmap.
  ```
- [ ] **Step 3 [Claude → Founder for approval]:** Stage the change and show what's about to commit:
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  git add README.md
  git diff --cached
  ```
  Pause for founder OK.
- [ ] **Step 4 [Claude]:**
  ```bash
  cd /Users/pranavaditya/projects/JobLens
  git commit -m "$(cat <<'EOF'
  docs: replace default README with project info

  Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
  EOF
  )"
  git push
  ```
- [ ] **Step 5 [Founder]:** Wait ~1 minute, then check Vercel — it should auto-redeploy. The site itself looks the same (README isn't shown publicly) but confirm no build error.

**Acceptance:** README updated and pushed; Vercel build succeeds.

---

## End-of-session checklist

- [ ] Local Node.js + git + VS Code working (`node --version`, `git --version`, `code --version` all pass)
- [ ] GitHub repo `joblens` exists, contains the Next.js scaffold and the design docs
- [ ] Supabase `joblens` project provisioned, 3 secrets saved
- [ ] Vercel project deployed; URL captured in chat
- [ ] Anthropic, Voyage, Adzuna, Apify, Wati accounts all created
- [ ] All 11 secrets in `.env.local` AND in Vercel env vars (matching names)
- [ ] Wati `joblens_otp` template submitted for Meta approval
- [ ] First two commits pushed to `main` on GitHub
- [ ] Hello-world Next.js welcome page rendering on Vercel

If any item is blocked (e.g., Wati subscription not active, Anthropic billing not added), document the blocker in chat — we may need to adjust Session 3 order.

---

## Notes for Session 3 (next time)

- Verify Wati template `joblens_otp` is **Approved** by Meta before starting auth code.
- Session 3 will: write the database migration for `profiles` + `otp_requests`, build phone-input UI, build OTP-input UI, write the Wati API client, write the OTP send/verify server actions, and integrate with Supabase Auth Admin to create or sign in users.
- We'll add the Anthropic + Voyage + Adzuna SDKs in their respective sessions, not preemptively.
