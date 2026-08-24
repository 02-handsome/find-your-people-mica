# Find Your People

A verified campus app where students post what activity they're looking for a
partner for, and get matched with a small number of people who posted the same
thing. Contact details are revealed only after both sides agree.

**Live URL:** https://find-your-people-mica.vercel.app

**Build status:** Phase 1 of 8 complete — repo, database connection, deployed
hello-world. Public URL loads over HTTPS, and the daily Supabase keep-alive has
run green. See `docs/PRD.md` section 9 for the full build sequence.

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
app/                    routes and layouts (App Router)
lib/env.ts              validated environment variables
lib/supabase/client.ts  Supabase client for Client Components
lib/supabase/server.ts  Supabase client for Server Components / Actions
supabase/ping.sql       keep-alive function, run once in the SQL Editor
.github/workflows/      the daily keep-alive job
docs/PRD.md             product requirements
docs/notes.md           architecture decisions, with reasoning
CLAUDE.md               working rules for this repo
```

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

_TODO (Phase 2–3): PRD requirement S5 wants two working test accounts documented
here and shown on the login screen. Blocked until auth and the seed script
exist._

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build (webpack — Turbopack builds are still beta on 15.5) |
| `npm run start` | Serve a production build locally |
| `npm run lint` | ESLint |
