# Find Your People

A verified campus app where students post what activity they're looking for a
partner for, and get matched with a small number of people who posted the same
thing. Contact details are revealed only after both sides agree.

**Live URL:** https://find-your-people-mica.vercel.app

**Build status:** Phase 8 of 8 complete, plus a full UI rebuild against a
Google Stitch design export — see `docs/notes.md` AD-30 and the export itself
under `docs/stitch-export/`. `docs/PRD.md` section 9 has the build sequence,
and `docs/notes.md` has every architecture decision with its reasoning and
what it cost.

---

## Demo

**Video:** _(link to be added)_

The live URL above opens on `/login`, which is F1.6 working rather than a
fault. Log in with the credentials printed on that screen — nothing needs
installing to follow along.

**Start from `test.two@micamail.in` / `FindYourPeople#2026`.** Both accounts are
listed under Test accounts below.

> **Direction matters, and it is not a bug.** F3.3 returns only the top 3, so
> matching is asymmetric: Test One is in test.two's list, but test.two does not
> make test.one's — three seeded users score higher. Sending the other way is
> refused with `NOT_A_CURRENT_MATCH`, which is F4.1 working correctly and looks
> exactly like a broken button to anyone who does not know that.

### Shot list — the full loop (PRD S1), about 90 seconds

| Time | On screen | What it demonstrates |
| --- | --- | --- |
| 0:00 | Open the live URL. It lands on `/login` | F1.6 — every route except login and signup is private |
| 0:08 | The campus notice and the test credentials on the login card | F1.2 and S5. The notice is rendered from the database allowlist, so it cannot contradict what signup actually accepts |
| 0:15 | Log in as **test.two** → home | Avatar, the active intent with its countdown (F2.3), and your own contact handle with the line saying when it gets shared |
| 0:28 | **Matches** in the bottom nav | Three ranked cards (F3.3) — name, year, tags, days, hours. The score is deliberately not rendered |
| 0:40 | **Connect** on Test One's card | The card changes to "Request sent" and cannot be sent again (F4.2) |
| 0:50 | Log out → log in as **test.one** | |
| 1:00 | Home shows "1 person wants to connect" | F4.3 — the sender's name, avatar, tags and intent details, and no contact handle. Deciding whether to accept must not require already holding what accepting grants |
| 1:10 | Read the line under the buttons, then **Accept** | *"Accepting shares your contact handle with them, and theirs with you."* The one irreversible action in the product, stated at the moment of the decision |
| 1:20 | **Connections** in the bottom nav | Test Two's number, revealed (F4.5, F4.7) |
| 1:28 | Back as test.two → **Connections** tab | The same reveal, the other way round. There is one accepted row, not one per direction, so neither party can be revealed without the other |

### Second clip — CRUD (PRD S3), about 30 seconds

| Time | On screen | What it demonstrates |
| --- | --- | --- |
| 0:00 | Home → **Edit Intent** on the intent card | Update (F2.4) |
| 0:08 | Change a day or the time window → **Save changes** | The countdown does not reset. F2.4 is explicit that `expires_at` survives an edit |
| 0:16 | **Withdraw** → **Yes, withdraw** | Delete (F2.5), behind an inline confirm rather than `window.confirm()` — which blocks the thread, cannot be tested, and looks foreign on mobile |
| 0:22 | The designed "No active intent" empty state → **Post an intent** | Create (F2.1). Every operation is two taps from home |

> **Re-seed after recording this one.** Re-posting through the UI gives the
> account F2.1's real `now() + 7 days`, which throws away the long horizon the
> published credentials depend on (AD-13 revised). `npm run seed` puts both back
> to 2027-12-31 and clears any requests they sent.

### Architecture talking points

Compressed for glancing at while recording. The full arguments, including what
each one cost, are in `docs/notes.md`.

**Three layers, and only the last one is security** — AD-1, AD-6

- `middleware.ts` refreshes the Supabase token cookie. It makes no authorization decision, ever.
- `app/(app)/layout.tsx` decides which **page renders**. That is a routing control.
- Postgres Row Level Security decides which **rows exist**. That is the boundary.
- The line to say out loud: *delete the layout check and RLS still refuses the query.*
- Why not middleware, which is what every tutorial does: CVE-2025-29927 let one spoofed header skip Next.js middleware entirely, so any app with its authorization there was bypassable. That bug is patched and this build is well past the fix — the point is architectural. A check in a layer that can be skipped from outside is bypassable in principle; a check inside the render path is not.
- Next 16 renamed middleware to `proxy` to signal exactly this. Writing it this way now means the pattern survives the upgrade.

**N4 is a shape, not a filter** — AD-20, AD-24

- `users` is self-only under RLS and **no cross-user read policy was ever added**, so there are exactly three ways to read another person's row. That is the whole attack surface.
- `get_matches()` and `get_incoming_requests()`: `contact_handle` is **absent from `RETURNS TABLE`**. Not filtered out — absent.
- `get_connections()`: the query selects **from** `requests where status = 'accepted'` and reaches the person through the join key that row supplies. `users` is not the subject of the query.
- Why that framing matters: a filter can be deleted and everything still compiles and runs. Removing the `status` line here does not widen the results slightly — it changes what the query is about, and stops making sense.
- One `case` expression picks whichever side of the request you are not. One accepted row, not one per direction, so mutual reveal is a property of the data model rather than of two calls that have to agree.
- Checkable from the catalog without reading any application code: `select p.proname from pg_proc p, unnest(p.proargnames) col where col = 'contact_handle';` → exactly one row.
- What is **not** claimed: `SECURITY DEFINER` means RLS does not apply inside those three functions. The argument reduces to three functions with two parameters between them — much smaller than every query in the app, which is the point, but not zero. It is why none of them takes a caller id.

**The ranking is lopsided on purpose** — AD-19, AD-21, AD-9

- `score = shared_days × 3 + (level match ? 2 : 0) + overlapping_tags × 2 + time_overlap_minutes / 30`
- Availability contributes roughly **5–27** points. Compatibility contributes **0–8**. About three to one.
- Why: you cannot train together at different times. Simultaneity is a precondition, not a preference — a level mismatch is negotiable, an empty overlap is not. Partnerships die of logistics, not of incompatibility.
- A term that moves every score equally ranks nobody. That is why the tag list mixes Anime, Coffee and Films in with Gym and Running: `activity` is already a hard filter, so activity-only tags would re-measure a fact the filter had already settled.
- The sort is `relaxed asc, score desc`, not score alone. In testing, two relaxed candidates scored 21 against a genuine match's 20 — sorting by score would have put two people with **zero overlapping hours** at the top of the list. Relaxation exists to fill a gap, not to compete.
- F3.4 relaxes the time overlap and never the shared day. Someone free on entirely different days is not a near miss.
- Because tags and level **rank** rather than filter, both forms say so. A field that ranks and a field that filters feel identical while you are filling them in; the difference only shows up in results, by which time the expectation is already set.

**The lesson that cost the most** — AD-10, AD-17

- A column-level `GRANT` cannot narrow a table-wide one. Supabase already grants `ALL` on `public` to `authenticated`, so `grant update (name, year, tags, contact_handle)` silently added nothing.
- It looked like enforcement. It did nothing. A live `PATCH` changed a user's email and returned 200.
- Reading the code would never have found it. Attempting the attack did.
- So the rule: for every requirement of the form *"user X must not be able to do Y"*, write the test that attempts Y.
- And its corollary, found the same way: a write blocked by RLS returns **success with zero rows**, so the test has to count rows rather than check for an error. A security test that fails open in the reporting direction is worse than no test — it manufactures confidence.
- Which is why `verify:constraints` makes 22 attempts at things the schema forbids (alongside 9 that must succeed, so it cannot pass by refusing everything), and `verify:reveal` attempts the leak by all three routes in every reachable request state.

---

## Success criteria (PRD section 2)

| # | Criterion | How it is met | How to check it |
| --- | --- | --- | --- |
| S1 | End-to-end flow completes without error | request → accept → reveal across the two test accounts | The shot list above, or `npm run verify:reveal` |
| S2 | A new user always sees at least 3 candidate matches | 32 seeded users with active intents, weighted toward 6–8am and 6–9pm | `npm run verify:seed` prints a per-day candidate count for every activity and time band |
| S3 | Full CRUD demonstrable through the UI | Post / Edit / Withdraw, two taps each from home | The second clip above |
| S4 | Deployed and publicly accessible | Vercel, HTTPS, auto-deploying from `main` | Open the live URL on a phone. No local setup |
| S5 | Two test accounts documented | Test accounts below, and rendered on the login screen from `lib/test-accounts.ts` | Load `/login` |

---

## How contact details are protected (PRD N4)

N4 is the product's one real security requirement: a `contact_handle` must never
be returned unless a request between those two users is `accepted`.

`users` is readable only by its owner (Row Level Security, since migration
`0001`), and **no cross-user read policy exists**. So there are exactly three
ways to read another person's row, and this is the whole attack surface:

| Function | Returns `contact_handle`? | Guaranteed by |
| --- | --- | --- |
| `get_matches()` | no | absent from its `RETURNS TABLE` |
| `get_incoming_requests()` | no | absent from its `RETURNS TABLE` |
| `get_connections()` | yes | the query is driven **from** accepted requests |

The third does not *filter* users by whether a request was accepted — it selects
**from** `requests where status = 'accepted'` and reaches the person through the
join key that row supplies. There is no result it can produce without one.

Verify it from the database, without reading any application code:

```sql
select p.proname from pg_proc p, unnest(p.proargnames) col
where p.pronamespace = 'public'::regnamespace and col = 'contact_handle';
-- expect exactly one row: get_connections
```

```bash
npm run verify:reveal
```

Attempts to obtain another user's handle in every reachable state — no request,
pending, declined, third-party accepted, and after a withdrawal auto-decline —
by all three routes at once. Eight attempts must fail; one must succeed, for
both parties. Full reasoning: `docs/notes.md` AD-24.

---

## Screens (PRD section 7)

Designed at 375px first, then scaled up. Route groups do not appear in URLs, so
`(app)` and `(complete)` are guards rather than path segments — see AD-6.

| # | Screen | Route | File |
| --- | --- | --- | --- |
| 1 | Login / Signup | `/login`, `/signup` | `app/(auth)/login/page.tsx` |
| 2 | Profile setup | `/profile-setup` | `app/(app)/profile-setup/page.tsx` |
| 3 | Post intent | `/intent/new`, `/intent/edit` | `app/(app)/(complete)/intent/new/page.tsx` |
| 4 | Home | `/` | `app/(app)/(complete)/page.tsx` |
| 5 | Matches | `/matches` | `app/(app)/(complete)/matches/page.tsx` |
| 6 | Connections | `/connections` | `app/(app)/(complete)/connections/page.tsx` |

Since the Stitch rebuild, Home, Matches and Connections are reached through a
bottom tab bar rather than links at the foot of each page, and /profile-setup
sits outside that shell because the completeness guard would bounce you
straight back out of anywhere it led.

Every one has a `loading.tsx` skeleton beside it that mirrors the real layout,
and every list has a designed empty state — `CLAUDE.md` forbids a blank screen
and a dynamic Server Component with no loading UI is one for the length of a
server round-trip. Screen 2 doubles as "Edit profile" after onboarding, which is
a deliberate addition to F1.3 rather than an accident of the routing (AD-11).

---

## Avatars

F1.4: generated from the user id, never uploaded. A trigger writes
`https://api.dicebear.com/9.x/thumbs/svg?seed=<user id>` into `avatar_url` at
signup (`supabase/migrations/0001_users.sql`), so the same person always gets
the same face and there is no upload path to secure.

That makes a third party a runtime dependency of every screen.
`components/Avatar.tsx` therefore renders the person's initials in a neutral
circle and positions the image **on top** of them. If DiceBear is unreachable —
down, rate-limiting, or blocked by a campus network — the image paints nothing
and the initials are already there. The fallback is the default state that
success covers, not something switched to on an event that might not fire: no
JavaScript, no Client Component, and it works before hydration.

Two attributes in that component look removable and are not: the image has no
background of its own, and its `alt` is empty. Either one changed puts an
opaque circle or a broken-icon glyph over the initials. Both are commented in
place; the measurements are in `docs/notes.md` AD-27.

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
scripts/verify-reveal.mjs       attempts the N4 leak in every request state
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
| `0005_requests_flow.sql` | send / incoming / connections / withdraw; the only function returning `contact_handle` |

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

### If the keep-alive stops running

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

### Which way round to run it

Send from **test.two**, accept as **test.one**. The other direction is refused,
and correctly so — the reason and the click-by-click sequence are in the Demo
section above.

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

31 checks as a real authenticated user. **22** are attempts at operations the
schema is supposed to forbid — privilege escalation, cross-user reads and writes,
illegal status transitions, self-requests, duplicate requests — each asserted
blocked. The other **9** are operations that must succeed, including the AD-14
lazy-expiry path, so the suite cannot pass by refusing everything. Creates two
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

## Known limitations

Every item here is either a deliberate V1 trade or a real constraint. They are
collected in one place so none of them has to be discovered.

| Area | Limitation | Why, and where it is argued |
| --- | --- | --- |
| Retention | Nothing explains why a user opens the app in week nine. Once a partnership forms, the app has served its purpose | PRD Q1 — the product's central unsolved problem, deliberately left unanswered rather than papered over |
| Trust and safety | No block, report, moderation or un-match. `accepted` is a terminal state | PRD Q2, AD-16. Acceptable for an assignment build, a hard blocker for real deployment |
| Email confirmation | Disabled, so someone with a valid campus address can sign up without proving they own that mailbox | AD-4. Domain validation is what gates access; confirmation would instead gate on inbox delivery and put a mail server inside F1's 60-second path. **Re-enable before real deployment** |
| Matching is asymmetric | Being in someone's top 3 does not put them in yours | F3.3 returns the top 3. Surfaced in the UI rather than hidden — the login screen says which direction to demo, because otherwise `NOT_A_CURRENT_MATCH` reads as a broken button |
| Sunday is thin | Every Mon–Sat cell has at least 3 candidates; Sunday sits at 2 | A consequence of F5.2 weighting the seed toward weekday mornings and evenings. It is where F3.4's relaxation earns its place, and `verify:seed` prints it rather than hiding it |
| Seeded expiry | All 32 seeded intents expire 2027-12-31, not `now() + 7 days` | AD-13 revised. Credentials published in a README have to work indefinitely. Nothing in the expiry-on-read filter changes — only the seeded values — and any intent posted through the UI gets the real 7-day window |
| Onboarding actions | F1 asks for "fewer than 8 input actions"; the fields F1.1 and F1.3 mandate come to 10 | AD-8. The criterion is unsatisfiable as written, so every specified field was kept and the real count reported, rather than dropping a field to hit a number |
| Keep-alive | GitHub disables scheduled workflows in public repos after 60 days with no commits, and the job's own runs do not count | See Keep-alive above. GitHub emails first and re-enabling is one click. Never fires during active development; can after submission |
| Outcomes are invisible | Contact hands off to WhatsApp, so the product cannot see whether a partnership actually formed | PRD Q4. The correct V1 trade and a real long-term cost — it is also why AD-19's weighting is untestable in V1 |
| Avatars | Every render tells api.dicebear.com the viewer's IP and the user id of everyone they were shown | AD-27. Generating the SVG locally is the fix, and the first thing to do past V1 |
| Theme toggle | Two-state. Once you pick light or dark there is no way back to "follow my system" short of clearing site data | AD-29. Accepted: anyone who never taps it keeps system-following. The CSS already treats an absent cookie as "follow the OS", so the three-state version is a change to the button alone |

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build (webpack — Turbopack builds are still beta on 15.5) |
| `npm run start` | Serve a production build locally |
| `npm run lint` | ESLint |
| `npm run seed` | Reset the 32 seeded identities and their intents (F5.5) |
| `npm run verify:seed` | Measure the seeded pool against F5.1 / F5.2 / F5.3 and print the numbers |
| `npm run verify:constraints` | 31 checks — 22 attempts at operations the schema forbids, each asserted blocked, and 9 that must succeed |
| `npm run verify:matches` | Reimplement F3's filter, score and sort independently, and compare against `get_matches()` |
| `npm run verify:reveal` | Attempt the N4 leak by all three routes, in every reachable request state |

The seed and all four `verify:*` scripts need `SUPABASE_SECRET_KEY` in
`.env.local` and refuse to run without it (AD-12). `verify:seed` only reads;
the other three create their own throwaway probe accounts, act as real
authenticated users, and delete only rows they created, by primary key. The
seed is the one script that deletes by predicate, and only within the 32
identities it declares ownership of — a real signup's data is never matched
(AD-25).
