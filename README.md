# Find Your People

A verified campus app where students post what activity they're looking for a
partner for, and get matched with a small number of people who posted the same
thing. Contact details are revealed only after both sides agree.

**Live URL:** https://find-your-people-mica.vercel.app

**Build status:** Phase 5 of 8 complete — the ranked match list. Three filtered,
scored results render. See `docs/PRD.md` section 9 for the full build sequence.

> Opening the live URL redirects to `/login`. That is required behaviour, not a
> fault: PRD F1.6 makes every route except login/signup private. See
> `docs/notes.md` AD-7.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15.5.23 (App Router) + TypeScript |
| Styling | Tailwind CSS 4 |
| Database / Auth | Supabase (Postgres) |
| Hosting | Vercel, auto-deploys from `main` |
| Keep-alive | GitHub Actions, daily |

**Next.js is pinned to an exact `15.5.23`, not `^15` or `latest`, on purpose.**
Supabase's official Next.js auth scaffold still generates a root `middleware.ts`;
Next 16 deprecated that convention in favour of `proxy.ts`. On 15 the Supabase
code is the configuration the vendor actually tests. This is a deadline project
where a documented path matters more than a current version number. Full
reasoning and the post-submission upgrade path: `docs/notes.md`, AD-2.

---

## Local setup

Requires Node.js 20.9 or newer (developed on 24.11.1).

```bash
npm install
```

```bash
cp .env.example .env.local
```

Then fill in the two values from the Supabase dashboard
(**Settings → API Keys**):

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`) |

```bash
npm run dev
```

Open http://localhost:3000.

If a variable is missing you get an explicit `Missing environment variable …`
error naming it, rather than an obscure network failure. That check lives in
`lib/env.ts`.

> **Never commit** the database password or the secret key (`sb_secret_…` /
> legacy `service_role`). Both bypass Row Level Security, and this repository is
> public. The publishable key is safe to expose — it is compiled into the browser
> bundle by design.

---

## Project layout

```
app/                       routes and layouts (App Router)
components/                shared UI pieces
lib/env.ts                 validated environment variables
lib/auth.ts                getUserId / getProfile / requireUserId
lib/intents.ts             intent + request vocabulary, shared with the seed
lib/matches.ts             match candidate type — no contact_handle, by shape
lib/profile-options.ts     years, tags, profile completeness
lib/supabase/client.ts     Supabase client for Client Components
lib/supabase/server.ts     Supabase client for Server Components / Actions
lib/supabase/middleware.ts token refresh helper
middleware.ts              refreshes the auth cookie — never authorises
supabase/ping.sql          keep-alive function, run once in the SQL Editor
supabase/migrations/       schema, run in order in the SQL Editor
scripts/seed.mjs           seed data (needs SUPABASE_SECRET_KEY)
scripts/verify-seed.mjs    measures F5.1 / F5.2 / F5.3 / AD-9
scripts/verify-constraints.mjs  attempts everything the schema forbids
scripts/verify-matches.mjs      reimplements F3 independently and compares
.github/workflows/         the daily keep-alive job
docs/PRD.md                product requirements
docs/notes.md              architecture decisions, with reasoning
CLAUDE.md                  working rules for this repo
```

Migrations are applied by hand in the Supabase SQL Editor, in order. Each is
idempotent, so re-running one is always safe:

| File | Contents |
| --- | --- |
| `0001_users.sql` | `users`, RLS, campus domain allowlist and gate |
| `0002_intents_requests.sql` | `intents`, `requests`, enums, constraints, triggers |
| `0003_create_intent.sql` | `create_intent()` — atomic lazy-expiry + insert (AD-14) |
| `0004_get_matches.sql` | `get_matches()` — the F3 query; its signature is the N4 guarantee |

Two Supabase clients rather than one because the browser stores the session in
cookies that the server also has to read. That shared-cookie handling is the
entire reason for `@supabase/ssr`.

---

## Deployment

Vercel builds every push to `main` and gives every branch a preview URL. No
configuration beyond the two environment variables, which must be added in
Vercel under **Settings → Environment Variables** for Production, Preview and
Development.

> Changing an environment variable in Vercel does **not** apply to existing
> deployments. Redeploy afterwards: **Deployments → ⋯ → Redeploy**.

---

## Keep-alive

Supabase pauses Free Plan projects after roughly 7 days of low database
activity. A paused database means the live URL errors for anyone who opens it.
`.github/workflows/keepalive.yml` runs daily at 06:17 UTC and calls a one-line
`public.ping()` Postgres function, which is enough activity to reset the timer —
7× headroom against the pause window.

Setup, once:

1. Run `supabase/ping.sql` in the Supabase SQL Editor.
2. Add two repository secrets under **Settings → Secrets and variables →
   Actions**: `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. (No `NEXT_PUBLIC_`
   prefix — that prefix means "ship to the browser", which is meaningless for a
   CI job.)
3. **Actions → Supabase keep-alive → Run workflow** to confirm it passes.

The job asserts the response body contains `pong`, not merely that the request
returned HTTP 200 — a revoked key would otherwise leave it green while the
database quietly paused.

### Known limitation

**GitHub disables scheduled workflows in public repositories after 60 days with
no repository activity, and this job's own runs do not count as activity — only
commits do.** GitHub sends a warning email and re-enabling takes one click. This
never triggers during active development; it can after submission. It is the
cost of a public repo, recorded here rather than left as a surprise.

---

## Test accounts

Both are live, have completed profiles, and are also displayed on the login
screen so no setup is needed (PRD S5).

| Email | Password |
| --- | --- |
| `test.one@micamail.in` | `FindYourPeople#2026` |
| `test.two@micamail.in` | `FindYourPeople#2026` |

These are throwaway accounts on a demo database with Row Level Security
enabled — signing in as one grants access to that account's own row and nothing
else. Defined in `lib/test-accounts.ts`.

**They match each other.** Both hold gym intents on overlapping weekday
mornings:

| Account | Intent |
| --- | --- |
| `test.one` | gym · Mon–Fri · 06:00–09:00 · regular |
| `test.two` | gym · Mon–Sat · 06:00–09:30 · regular |

So the full **request → accept → reveal** loop (PRD S1) can be demonstrated
using only these two logins, with no signup required. The 30 seeded users have
random passwords and exist as match candidates, not as logins — F5.4 only asks
for two functional accounts.

## Seed data (PRD F5)

The database ships with 30 fixture users plus the two test accounts: 32 users,
32 active intents, spread across gym / running / sport and weighted toward
6–8am and 6–9pm.

```bash
npm run seed
```

Re-runnable and idempotent (F5.5) — running it again reuses the existing auth
users and leaves the counts at 32/32. Requires `SUPABASE_SECRET_KEY` in
`.env.local`; it refuses to run without one rather than falling back to the
publishable key. See `docs/notes.md` AD-12.

```bash
npm run verify:seed
```

Measures the seeded data against F5.1 / F5.2 / F5.3 and prints the real
numbers — a per-day grid of candidate counts for every activity and time band,
the overlap count for each test account, and the tag-overlap spread that makes
F3's `overlapping_tags × 2` term able to rank anything (`docs/notes.md` AD-9).

**Known thin spot, by design:** every Mon–Sat cell has ≥3 candidates; **Sunday
sits at 2**. That is where F3.4's "Close, but different hours" relaxation earns
its place. The verification prints it rather than hiding it.

```bash
npm run verify:constraints
```

Attempts 27 operations the schema is supposed to forbid — privilege escalation,
cross-user reads and writes, illegal status transitions, self-requests, duplicate
requests — as a real authenticated user, and asserts each is blocked. Creates two
throwaway probe accounts and deletes them afterwards, so seeded data is never
touched. This exists because a column-level `GRANT` once silently did nothing and
the escalation succeeded in production (`docs/notes.md` AD-10).

## Signing up

Only `@micamail.in` and `@mica.ac.in` addresses can create an account (PRD
F1.2). The allowlist lives in **one** place — the
`public.allowed_email_domains()` function in
`supabase/migrations/0001_users.sql`. Add a domain there and re-run that
function; no application code changes, and the notice on the login screen
updates itself because it reads the same function.

This is enforced by a trigger on `auth.users`, not in application code. The
publishable key is public by design, so anyone can call Supabase's signup
endpoint directly — an application-layer check would be decorative. See
`docs/notes.md` AD-5.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build (webpack — Turbopack builds are still beta on 15.5) |
| `npm run start` | Serve a production build locally |
| `npm run lint` | ESLint |
