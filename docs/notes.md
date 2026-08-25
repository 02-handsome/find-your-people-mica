# Architecture Decisions

Running record of decisions I need to be able to defend. One entry each: what I
chose, why, and what I gave up.

---

## AD-1 — Authorization lives in the server layout. Middleware only refreshes the token cookie.

**Decision.** The "is this user allowed to see this page?" check runs in a Server
Component layout, via `supabase.auth.getClaims()` then `redirect()`.
`middleware.ts` is limited to one job: refreshing the Supabase access-token
cookie. It makes no access-control decision.

**Why the question comes up.** Supabase's own Next.js scaffold generates a root
`middleware.ts`, and most tutorials put the auth redirect inside it. That is the
path of least resistance and I deliberately did not take it.

**Reasoning.**

1. **Server Components cannot write cookies.** Supabase access tokens expire
   (1 hour by default) and refreshing one means writing a new cookie. A Server
   Component physically cannot, so something in the request path must —
   middleware is the only place that runs before render and can write to the
   response. That is a real job, and the only one middleware is needed for here.

2. **Authorization in middleware has been the wrong place, demonstrably.**
   CVE-2025-29927 (CVSS 9.1, critical) let an attacker skip Next.js middleware
   entirely by spoofing `x-middleware-subrequest` — an internal header Next.js
   used to prevent infinite middleware loops and trusted without verifying its
   origin. Any app whose authorization check lived in middleware was bypassable
   by adding one header.

   **Stated precisely, because overstating this would be wrong:** that specific
   bug is patched, and the version pinned here (15.5.23) is well past the 15.2.3
   fix. I am not avoiding a live vulnerability. The point is architectural — the
   check was bypassable because it sat in a layer that can be skipped from
   outside. A check inside the render path cannot be skipped by a header.

3. **Middleware coverage is silently losable.** Next.js's own documentation warns
   that changing a `matcher`, or moving a Server Function to a different route,
   can quietly remove middleware coverage from a path — and advises verifying
   authorization inside each Server Function rather than relying on middleware.
   A security control that disappears when someone edits a regex is fragile.

4. **It is the framework's current guidance.** Next.js 16 renamed middleware to
   `proxy` specifically to signal it should be a thin routing layer — rewrites,
   redirects, headers — and that auth belongs in layouts and route handlers.
   Writing it this way now means the pattern survives the upgrade.

**Shape of the code.**

```tsx
// app/(app)/layout.tsx — the authorization boundary
const supabase = await createClient();
const { data } = await supabase.auth.getClaims();
if (!data?.claims) redirect("/login");
```

```
middleware.ts        → refresh the token cookie. No authz decision.
app/(app)/layout.tsx → the authz decision. Runs inside the render path.
Postgres RLS         → the real boundary. Holds even if both of the above are wrong.
```

**Defence in depth.** The layout check is a *routing* control — it decides which
page renders. It is not what protects the data. Row Level Security in Postgres
is, and RLS is what actually enforces PRD **N4** (`contact_handle` is never
returned unless a request between the two users is `accepted`). If the layout
check were deleted outright, RLS would still refuse the query. That ordering is
deliberate: the database is the last line and the only one an attacker cannot
route around.

**What I gave up.** A redirect in middleware fires before any rendering, so it is
marginally cheaper than rendering a layout that then redirects. I am paying a few
milliseconds for a control that cannot be bypassed by a header. Fine trade.

---

## AD-2 — Next.js pinned to 15.5.23, not 16.x

**Decision.** `next` pinned to an exact `15.5.23`, `eslint-config-next` matched.
No caret.

**Reasoning.** Supabase's official Next.js auth scaffold still generates a root
`middleware.ts` plus a `lib/supabase/middleware.ts` helper; it has no `proxy.ts`
path and does not mention Next 16. Next 16 *deprecated* `middleware.ts` rather
than removing it, so that scaffold would probably still run on 16 — but
"probably" is load-bearing in that sentence, and on 15 the same code is the
configuration the vendor actually tests. For a graded build on a deadline, the
size of the searchable corpus matters more than being on the newest minor.

Cost of the pin: nothing that affects this project. `create-next-app@15.5.23`
installs Tailwind 4 and React 19 either way, and nothing in the PRD needs a
16-only feature. 15.5.23 is a current release on an actively maintained backport
line, so security fixes still land.

**Upgrade path — after grading, not during.**

```
npm i next@latest eslint-config-next@latest
npx @next/codemod@canary middleware-to-proxy .
```

The codemod renames `middleware.ts` → `proxy.ts` (project root or `src/`, at the
same level as `app` — not inside it) and the exported `middleware` function →
`proxy`. Because authorization was never in that file, the rename touches token
refresh only and cannot regress access control. A second, practical payoff
from AD-1.

---

## AD-3 — The keep-alive pings a Postgres function, not a table or the REST root.

**Decision.** A GitHub Actions job calls a one-line `public.ping()` SQL function
once a day via PostgREST RPC, using the publishable key.

**Reasoning.** Supabase pauses Free Plan projects after roughly 7 days of low
database activity, and this build spans weeks with quiet stretches. A paused
database means the graded URL errors when a grader opens it. Three candidate
targets, and only one works:

- **A dedicated `health` table** — rejected. `CLAUDE.md` caps the schema at three
  tables (`users`, `intents`, `requests`), and a fourth for monitoring is exactly
  the kind of creep that rule exists to stop.
- **`GET /rest/v1/`** — rejected. That returns PostgREST's *cached* OpenAPI
  schema and may never touch Postgres, so it could return 200 forever while the
  database slept.
- **An RPC to a trivial function** — chosen. It is not a table, it exists from
  day one (before any schema), and PostgREST executes a real `SELECT` inside
  Postgres, which is what resets the inactivity timer.

**Why the publishable key and not the secret key.** The function returns a
constant and reads no data, so `anon` execute rights cost nothing — and no
high-privilege credential ever enters GitHub.

**Why it asserts the response body.** The job checks for `pong`, not just
HTTP 200. A revoked key or a dropped function would otherwise return something
2xx-shaped and the job would stay green while the database quietly paused. A
monitor that cannot fail is not a monitor.

**Known limitation, accepted.** GitHub disables scheduled workflows in *public*
repos after 60 days with no commits, and the workflow's own runs do not count as
activity. GitHub emails first and re-enabling is one click. During active
development this never fires; after submission it can. This is the cost of a
public repo and it is documented in the README rather than hidden.

---

## AD-4 — Email confirmation is disabled. Re-enable it before real deployment.

**Decision.** Supabase's "Confirm email" setting is turned off, so `signUp()`
returns a live session and the user lands on profile setup immediately.

**Reasoning.**

- **Domain validation is what gates access here**, not confirmation. Only
  `@micamail.in` / `@mica.ac.in` addresses can create an account at all, and
  that is enforced in the database (AD-5).
- **Confirmation would instead gate on inbox delivery** — a different thing
  entirely. It proves someone can read that mailbox, which V1 does not need,
  and it makes signup depend on a mail server we do not control.
- **It breaks F1's 60-second onboarding requirement.** "Signup to usable home
  screen under 60 seconds" is impossible if the middle step is "go and check
  your email".
- **It puts a mail server in the demo path.** PRD S1 has a grader signing up
  live. If `micamail.in` filters or delays the message, signup dead-ends on
  camera, and no amount of correct code recovers that.

**What I gave up.** Anyone with a valid campus address can create an account
without proving they own that mailbox — so one student could sign up as another.
Acceptable for an assignment build, consistent with PRD Q2 already placing trust
and safety out of V1 scope.

**This must be re-enabled before any real deployment.** At that point
confirming address ownership is the entire point, and the 60-second criterion
stops being the binding constraint.

---

## AD-5 — The campus domain allowlist lives in Postgres, not TypeScript.

**Decision.** One SQL function, `public.allowed_email_domains()`, is the sole
source of truth. Adding a domain is a one-line edit there and nothing in the
application changes.

**Reasoning.** A TypeScript-only check would be decorative. The publishable key
is public by design — it ships in the browser bundle — so anyone can read it and
call `POST /auth/v1/signup` directly, skipping our Server Action entirely. Only
the database can actually enforce F1.2, via a `before insert` trigger on
`auth.users`.

Given the database must hold the list, keeping a second copy in TypeScript would
mean two places to edit and two places to disagree. So the app reads the list
*from* the database:

| Consumer | Purpose |
| --- | --- |
| Trigger on `auth.users` | the real gate; cannot be bypassed |
| Signup Server Action (`is_email_allowed` RPC) | produces the exact F1.2 message |
| Login/signup notice (`allowed_email_domains` RPC) | copy that cannot contradict the gate |

**Why the RPC pre-check exists at all**, given the trigger is authoritative:
Supabase Auth flattens a trigger exception into an opaque
`500 Database error saving new user`, which is unusable as user-facing copy. The
pre-check produces the specified message; the trigger guarantees the outcome.

**Also worth knowing:** `UPDATE` on `public.users` is granted per-column
(`name`, `year`, `tags`, `contact_handle`). `email` is deliberately not
writable, so a user who signed up on an allowed domain cannot later rewrite
their address to something off-domain.

---

## AD-6 — Route groups, not middleware, enforce F1.6.

**Decision.** `app/(app)/layout.tsx` performs the "signed in?" check.
`middleware.ts` only refreshes the token cookie.

This is AD-1 applied. The layer structure:

```
middleware.ts                  refresh the cookie. No authz. Ever.
app/(auth)/layout.tsx          signed in already -> redirect "/"
app/(app)/layout.tsx           not signed in -> redirect "/login"     [F1.6]
app/(app)/profile-setup/       inside the auth guard, outside the completeness guard
app/(app)/(complete)/layout.tsx  profile incomplete -> redirect "/profile-setup"
```

**Why `(complete)` is nested inside `(app)`.** If one layout checked both
session and profile completeness, `/profile-setup` would redirect to itself
forever. Splitting them puts profile setup inside the session guard but outside
the completeness guard. Route groups do not appear in URLs, so
`(complete)/page.tsx` still serves `/`.

**Every Server Action re-checks auth** via `requireUserId()` rather than
trusting the layout. Next.js treats Server Functions as POSTs to whatever route
they are used on, and its own docs warn that a `matcher` edit or moving an
action can silently drop it out of middleware coverage. The layout guard is for
routing; it is not an authorization substitute.

---

## AD-7 — The live URL now opens on /login, not the Phase 1 homepage.

Worth remembering, because the deployed site behaves visibly differently from
Phase 1.

F1.6 requires that unauthenticated users hitting any route other than
login/signup are redirected to login. `/` is such a route, so an anonymous
visitor to https://find-your-people-mica.vercel.app is now redirected to
`/login`.

The Phase 1 homepage was not deleted so much as **relocated**: its "Find Your
People" heading and one-line pitch now open the login screen, which is also
where PRD S5 wants the test credentials. So the graded URL still lands on a
designed, branded screen with a way in — it is simply the login screen rather
than a standalone splash. `app/page.tsx` is gone; `/` is served by
`app/(app)/(complete)/page.tsx`.

---

## AD-8 — F1's acceptance criterion is arithmetically unsatisfiable. Kept the fields, reported the number.

F1's acceptance reads: *"Signup to usable home screen takes under 60 seconds and
fewer than 8 input actions."*

The fields F1.1 and F1.3 mandate come to **10**:

| Screen | Actions |
| --- | --- |
| Signup | email, password, submit — **3** |
| Profile setup | name, year, tag ×3, contact handle, submit — **7** |
| | **10 total** |

Counting the tag picker as a single interaction rather than three taps gives
**8** — still not *fewer than* 8.

The under-60-seconds half is met comfortably.

**Decision: keep every field the PRD specifies and report the real count.** The
alternative was dropping a mandated field to hit a number, which would trade a
spec that is wrong for a product that is worse. The requirement is unsatisfiable
as written; the honest deliverable is the measured figure and the arithmetic
above, not a silently amended criterion.

If it is ever revised, the sensible target is **fewer than 12**, which keeps the
intent — onboarding short enough that nobody abandons it — without asking for
fewer actions than there are required fields.

---

## AD-9 — The tag vocabulary mixes activities with unrelated interests, on purpose.

**Decision.** Six activity-adjacent tags (Gym, Running, Football, Cricket,
Badminton, Trekking) plus eight that have nothing to do with training
(Marketing, Finance, Consulting, F1, Anime, Coffee, Startups, Films).

**Reasoning.** F3 scores candidates as:

```
score = (shared_days × 3) + (experience_level match ? 2 : 0)
      + (overlapping_tags × 2) + (time_overlap_minutes / 30)
```

`activity` is a **hard filter** (F3.1) — every candidate being scored has
already matched on it. So a tag list made only of activities would make
`overlapping_tags` largely restate that filter: two gym-goers both tagging "Gym"
score +2 for a fact already established, which inflates all scores roughly
equally and discriminates between nobody. A term that moves every score by the
same amount does no ranking work.

The interest tags restore the independence the formula assumes. Availability
(days, times) decides *who could*; interests decide *who you would actually want
to*. That is the difference between a partner you meet twice and one you keep.

**Consequence for Phase 3.** The seed script must spread interest tags widely
rather than clustering them, or `overlapping_tags` collapses back to noise and
ranking is driven by `shared_days` alone.

**Consequence for the UI (added in Phase 4).** If tags rank rather than filter,
the profile screen has to say so. "Pick 3 things you're into", sitting above a
list containing Films, Anime and Coffee, reads as a promise of interest-based
matching — and the app would silently never deliver it, because F3.1 builds the
pool from `activity` and F3.2 hard-filters on day and time overlap. Someone who
picks Films and is shown three gym partners with no interest in film has been
misled by the form, not by the algorithm.

One line above the chips now states the actual contract: *"These don't decide
who you match with — your activity and times do. They set the order."*

The general point is worth keeping: **a scoring term and a filter feel identical
to a user filling in a form.** Both are "things I told the app about myself". The
difference only shows up in results, by which time the expectation has already
been set. Any field that ranks rather than filters needs to say which it is.

---

## AD-10 — A column-level GRANT cannot narrow a table-wide one. Found by testing.

**The bug.** The first version of `0001_users.sql` contained:

```sql
revoke all on public.users from anon;
grant select on public.users to authenticated;
grant update (name, year, tags, contact_handle) on public.users to authenticated;
```

The intent was that an authenticated user could edit only those four profile
columns — so `email` would be immutable and nobody could escape the F1.2 domain
gate after signing up.

**It did nothing.** A live test signed in as a normal user and successfully ran:

```
PATCH /rest/v1/users?id=eq.<own id>   {"email": "escalate@gmail.com"}
→ 200, email changed
```

**Why.** Supabase's default privileges already grant `ALL` on tables in `public`
to `authenticated`. A column-level `GRANT` only ever **adds** privileges — it
cannot narrow a table-wide grant that already exists. I revoked from `anon` but
never from `authenticated`, so the column list was decorative. The fix is one
line, and it has to come *first*:

```sql
revoke update on public.users from authenticated;
grant update (name, year, tags, contact_handle) on public.users to authenticated;
```

**The general lesson, which is the reason this is written down.** This is the
same failure mode as AD-5: a control that *looks* like enforcement but isn't. In
AD-5 it was a domain check in TypeScript that a direct API call walks straight
past. Here it was a column grant that Postgres silently treated as a no-op.
Neither produced an error. Neither would have been caught by reading the code —
only by attempting the attack.

**So a trigger now enforces it too.** `prevent_identity_change()` rejects any
UPDATE that alters `id`, `email` or `created_at`. Grants are configuration and
easy to get subtly wrong; the trigger holds regardless of which role is
connected or what it was granted. Two independent mechanisms for one invariant,
because the first one already failed once.

**Practice worth keeping:** for every rule of the form "user X must not be able
to do Y", write the test that *attempts* Y. The passing tests in this phase
(RLS blocking cross-user reads, the campus domain gate) only mean something
because the same test method caught a real hole in the third case.

---

## AD-11 — Profile editing is in scope, beyond F1.3. A wrong contact handle is unrecoverable otherwise.

**Decision.** `/profile-setup` stays reachable after the profile is complete. It
prefills from the stored row, saves changes, and is linked from the home screen
as "Edit profile". F1.3 describes onboarding only — this is a deliberate
addition to that scope, not an accident of the routing.

**Reasoning — this is a correctness issue, not a convenience.**

`contact_handle` is the entire payload of the product. F4.5 reveals it to the
other party the moment a request is accepted, and that is the only thing the
reveal delivers. A typo in it therefore means:

- The reveal hands out a **wrong number**, permanently, to every match.
- The failure is **silent on both sides**. The sender thinks the connection
  worked. The recipient texts a stranger, or nothing. Neither can tell whether
  the other person is ignoring them or the number was simply wrong.
- There is **no recovery path**. Without editing, the only fix is a second
  account — which the campus domain gate makes hard on purpose, and which would
  orphan every existing accepted request.

So a read-only profile does not merely inconvenience someone who mistypes; it
breaks the product's single promise in the one way nobody can diagnose. That is
worth more than strict adherence to a phase boundary.

**Consistent with the PRD's own instincts.** F2.4 already establishes that a
posted intent must be editable (days, time window, level) without resetting its
expiry. Making the thing a user posts correctable is a principle the spec
applies elsewhere; F1.3 just does not say it about the profile.

**Cost.** Close to nothing. The page, the form, the prefill and the validation
already existed for onboarding; this adds a link on the home screen and swaps
two labels ("Edit your profile", "Save changes"). No new route, no new action, no
new query. There is no redirect loop because the completeness guard lives one
level down, in `(complete)/layout.tsx`.

**What is deliberately still NOT editable:** `email`, `id` and `created_at`,
enforced by both the column grant and the `prevent_identity_change` trigger
(AD-10). The distinction is the point — **identity is fixed, contact details are
not**. Letting someone rewrite their email would walk straight out of the campus
domain gate; letting them fix a phone number is the product working.

---

## AD-12 — The Supabase secret key is local-only, and the seed refuses to run without it.

**Decision.** `SUPABASE_SECRET_KEY` lives in `.env.local` (gitignored, verified
never committed), is read by `scripts/seed.mjs` alone, and is never imported by
application code.

**Why it is needed at all.** `public.users.id` foreign-keys to `auth.users(id)`,
so a seeded user needs a real auth user. No public endpoint can create an auth
user on someone else's behalf. The alternative — signing 32 users up through the
normal public flow — trips Supabase's per-IP signup rate limit partway through
and leaves the database half-seeded, which is the opposite of the re-runnable
script F5.5 asks for.

**The script hard-fails rather than falling back.** If the key is missing it
exits non-zero with an explanation. A silent fallback to the publishable key
would half-seed under RLS and produce a wall of confusing permission errors
instead of one clear message. It also inspects the key it was given: a
`sb_publishable_` value is rejected outright, and a legacy JWT is rejected
unless its `role` claim is actually `service_role` — because prefix alone cannot
distinguish a legacy anon key from a legacy service_role key, both of which
begin `eyJ`.

**A structural protection, not just a convention:** the variable deliberately
has **no `NEXT_PUBLIC_` prefix**. Next.js only inlines `NEXT_PUBLIC_*` into the
browser bundle, so even an accidental import into a Client Component yields
`undefined` in the browser rather than shipping the key to every visitor.
`scripts/` also sits outside `app/` and `lib/`, so nothing in the app's import
graph reaches it.

---

## AD-13 — Seeded expiry is a fixture choice, not a spec deviation.

**Decision.** The 30 fixture users get a far-future `expires_at`. The two
published test accounts get exactly `now() + 7 days`, per PRD 4.2.

**No code path changes.** The expiry-on-read filter
(`status = 'active' AND expires_at > now()`) is untouched and spec-exact. Only
the seeded *values* differ. `expires_at` is data; the 7-day rule in F2.1 governs
what happens when a **user** creates an intent through the UI, and that is
unchanged.

**What it protects.** S2 requires that "a new user always sees at least 3
candidate matches on first search". With spec-exact fixture expiry, every
seeded intent lapses seven days after seeding — so if the app is opened for
grading eight days later, the match list is empty and S2 fails **with no visible
cause**. That is a worse outcome than fixtures having a longer horizon than real
rows.

**Why the test accounts keep the real window.** They are the accounts a grader
actually logs into, so expiry stays demonstrable on the screens where F2.3's
countdown appears. And it degrades gracefully: if theirs lapse, the grader posts
a new intent and the 30-strong pool is still there.

---

## AD-14 — The one-active-intent rule and expiry-on-read mildly conflict.

Two `CLAUDE.md` hard rules meet here:

- *"One active intent per user. Enforce it."* → a partial unique index on
  `(user_id) where status = 'active'`.
- *"Expiry on read, not cron."* → an expired intent keeps `status = 'active'`
  with a past `expires_at`.

Together: a user whose intent lapsed **still occupies the unique slot**, so
inserting a replacement fails. Each rule is right on its own; the gap is that
nothing ever transitions `active → expired`.

**Resolution for Phase 4.** The create-intent path first flips the caller's own
expired-but-active rows to `'expired'`, then inserts — both inside one
`SECURITY DEFINER` function so it is atomic. That is expiry-at-**write**, which
is not what the rule forbids: the rule bars a **scheduled job**, and this runs
only because a user acted. Reads keep filtering
`status = 'active' AND expires_at > now()` regardless, so correctness never
depends on the cleanup having happened.

Phase 3 does not hit this — every seeded intent is fresh. Written down so
Phase 4 does not rediscover it as a bug.

---

## AD-15 — Column-scoped INSERT, not just UPDATE.

AD-10 applied *before* being bitten this time. Every grant in `0002` revokes
first, and `INSERT` is column-scoped as well as `UPDATE`:

```sql
revoke insert, update on public.intents from authenticated;
grant insert (user_id, activity, days, time_start, time_end, experience_level) ...
grant update (days, time_start, time_end, experience_level, status) ...
```

**Why scoping the insert matters as much as the update:** with a table-wide
`INSERT` grant a user could supply their own `expires_at` and hand themselves a
ten-year intent. Restricting the column list forces `status`, `created_at` and
`expires_at` to take their defaults. Verified by
`npm run verify:constraints` — the attempt returns `42501`.

**What is immutable on an intent, and why:** `activity` (F2.4 lists days, time
window and experience level as editable, and not activity — changing it would
move a user into a different match pool while their existing requests dangled)
and `expires_at` (F2.4 is explicit that it does not reset on edit). Both are
enforced by the grant *and* by `prevent_intent_identity_change`.

---

## AD-16 — An enum constrains values, not transitions.

**Found by review, not by testing** — the schema was written, and the question
"is there anything stopping a user setting an arbitrary status?" turned out to
have the answer "no".

`status` must be user-writable for withdrawal (F2.5) and accept/decline (F4.4).
The enum type limits it to three **values**. It says nothing about **direction**.
Before this was fixed a user could:

- mark a **live** intent `expired` — a lie that removes it from match pools while
  claiming time ran out, destroying the distinction between "the user withdrew"
  and "it lapsed";
- flip `withdrawn` back to `active`, so F2.5's *"withdrawn intents disappear from
  all match pools immediately"* became a toggle rather than a commitment;
- flip `expired` back to `active` and re-occupy the one-active slot, locking
  **themselves** out of posting a new intent;
- as a recipient, revive a `declined` request into `accepted` — reviving a
  refusal the sender was never told about, since F4.6 makes declines silent;
- or move `accepted` back, "un-revealing" a `contact_handle` the other party has
  already seen and the data can no longer retract.

Two triggers now enforce the PRD's actual state machines:

```
intents:   active ──> withdrawn   (terminal)
             └──────> expired     (terminal, and only once expires_at has passed)

requests:  pending ──> accepted   (terminal — reveals contact, F4.5)
              └──────> declined   (terminal — silent to the sender, F4.6)
```

`active → expired` is permitted **only when `expires_at` has already passed**:
lazy expiry may *record* what is true, never bring it about.

Terminal states are also what make F3.1 coherent. It excludes only *pending or
accepted* pairs, so after a decline the pair becomes eligible again and a fresh
attempt is a **new row** — exactly F4.6's "the card simply returns to neutral".

**Worth noting for a real deployment:** `accepted` being terminal means there is
no un-match, and V1 has no block or report either (PRD Q2 concedes this). Both
would be required before this went near real students.

---

## AD-17 — A zero-row UPDATE returns no error. Security tests must count rows.

The constraint suite's first run reported a false failure: *"A (the sender)
cannot accept its own request"* appeared **ALLOWED**. The RLS policy had worked
perfectly — `auth.uid() = to_user_id` excluded the row, the UPDATE matched zero
rows, and **PostgREST returned success with an empty array**.

The assertion only checked whether an error came back, so a policy doing its job
was indistinguishable from a successful write.

**Why this matters more than the false alarm.** The blind spot is not
symmetrical. It cried wolf here, but the identical logic would have shown a
green tick for a write that silently affected zero rows when it should have
raised — a security test that **fails open in the reporting direction** is worse
than no test, because it manufactures confidence.

Every operation in `scripts/verify-constraints.mjs` now ends in `.select()`, and
the harness distinguishes three outcomes:

| Outcome | Meaning |
| --- | --- |
| error returned | blocked loudly by a grant, constraint or trigger |
| no error, 0 rows | blocked silently by RLS |
| no error, N rows | **genuinely allowed** — a real failure |

The output names which layer caught each attempt, which matters because several
are stopped by the column grant *before* the trigger ever runs. AD-10 was about
a control that did nothing; this is about a **test** that could report nothing.

---

## AD-18 — AD-14 resolved: one function, one transaction, and only for create.

`public.create_intent()` (migration `0003`) does the lazy cleanup and the insert
in a single transaction:

```sql
update public.intents set status = 'expired'
 where user_id = v_user and status = 'active' and expires_at <= now();
-- then the F2.2 check, then the insert
```

**Why this is not the scheduled job the rule forbids.** `CLAUDE.md` says
"expiry on read, not cron". This runs *only because a user asked to post an
intent* — never on a timer, never on a page render. And it only marks rows
already past their `expires_at`, so it records what is true rather than bringing
it about, which is also the only `active → expired` move AD-16's trigger allows.
Reads keep filtering on both columns regardless, so correctness never depends on
the cleanup having happened.

**Why the signature is the security boundary.** `SECURITY DEFINER` runs as the
function owner, bypassing RLS *and* the column grants from AD-15. So the
identity comes from `auth.uid()`, and **`user_id`, `status` and `expires_at` are
not parameters**. There is no value a caller could pass to write a row for
someone else or hand themselves a ten-year intent — the protection is preserved
by the shape of the function rather than routed around by it. `EXECUTE` is also
revoked from `PUBLIC` and granted only to `authenticated`.

**Why only create needs a function.** Update and withdraw are plain writes
already constrained by three independent things: the column grant (only
`days`, `time_start`, `time_end`, `experience_level`, `status`), RLS (own row),
and the AD-16 transition triggers. Wrapping them would add a second privileged
path for no gain. The rule of thumb worth keeping: a `SECURITY DEFINER` function
is justified when an operation needs *more* privilege than the caller has —
not merely because it is important.

**Two taps, counted (F2's acceptance criterion).**

| Operation | Path from home | Taps |
| --- | --- | --- |
| Read | already on the screen | 0 |
| Create | "Post an intent" → "Post intent" | 2 |
| Update | "Edit" → "Save changes" | 2 |
| Delete | "Withdraw" → "Yes, withdraw" | 2 |

Withdraw uses an inline confirmation rather than `window.confirm()`, which is
untestable, blocks the thread and looks foreign on mobile. The confirm step is
the second tap, so the destructive action stays guarded without exceeding the
budget.

---

## AD-19 — F3 weights availability above compatibility. Deliberately.

**The observation.** In F3's formula, one extra shared day (3 points) outranks a
matching experience level (2 points). Two people with nothing in common but a
five-day overlap beat a same-level partner who is free three days.

That looks like a mis-weighting. It is the intended shape.

```
score = (shared_days × 3)                   →  3 – 21   availability
      + (time_overlap_minutes / 30)         →  ~2 – 6   availability
      + (overlapping_tags × 2)              →   0 – 6   compatibility
      + (experience_level match ? 2 : 0)    →   0 – 2   compatibility
```

Availability can contribute roughly **5–27** points, compatibility **0–8**. The
formula is about three times more interested in whether you can actually meet
than in whether you will get along.

**Why that is right for this product.**

1. **Availability is the scarce resource.** On a campus of 400, plenty of people
   like the gym. Far fewer are free at 6am on the days you are. The binding
   constraint is coincidence of schedule, and ranking should spend its resolution
   on the scarce thing.

2. **The product is built on simultaneity.** You cannot train together at
   different times — it is not a preference, it is a precondition. A level
   mismatch is negotiable: a serious runner can do an easy run with a beginner,
   and often will. An empty overlap is not negotiable by anyone.

3. **Partnerships die of logistics, not incompatibility.** A gym partnership
   that fails usually fails because the two people stopped being able to meet,
   not because their training styles differed slightly. Weighting toward days
   optimises for the failure mode that actually occurs.

4. **A common term discriminates poorly.** With three levels, roughly a third of
   candidates match on level by chance, so the term carries little information —
   the same argument AD-9 makes about tags. `shared_days` varies from 1 to 7 and
   separates candidates far more sharply.

5. **It matches the problem statement.** PRD 1.1 frames the problem as
   *discovery* and *status cost*, not compatibility filtering. The app's job is
   to surface someone you could plausibly meet; judging whether you suit each
   other is what the two of you do afterwards.

**The assumption underneath, stated honestly.** This bets that a level-mismatched
pair who can actually meet does better than a level-matched pair who mostly
cannot. That is plausible but **untested** — and V1 cannot test it, because PRD
Q4 concedes that handing off to WhatsApp makes outcomes invisible to the
product. If it turned out that level mismatch is what kills partnerships, the
right response would be to raise the level weight or promote it to a soft filter,
not to reshuffle everything.

**Consequence for the UI.** Because level ranks rather than filters, the intent
form now says so: *"You'll still match with every level — this just nudges
similar ones higher."* Choosing "Serious" otherwise reads as "don't pair me with
beginners" — a request the app never agreed to, and would visibly break on the
first match list.

---

## AD-20 — N4 is enforced by a function signature, not by a filter.

**Decision.** The cross-user read is `public.get_matches()`, a `SECURITY DEFINER`
function whose `RETURNS TABLE` list contains no `contact_handle` column. No
cross-user read policy was added to `users` or `intents`; both keep their
self-only RLS from Phase 2.

**Why a signature rather than a policy.** Row Level Security filters *rows*, not
*columns*. A policy permitting a viewer to see candidates' rows would expose
every column of those rows, `contact_handle` included, and the protection would
then rest on every query remembering to omit it — in the page, in any future
API route, in anything a later phase adds. That is the failure mode AD-10
already caught once: a control that looks like enforcement and does nothing.

With a fixed output shape, leaking the column requires **adding it to the
signature** — a visible, reviewable act — rather than forgetting a filter. The
guarantee is checkable from the catalog without reading any application code:

```sql
select unnest(proargnames) from pg_proc where proname = 'get_matches';
```

Supporting properties: **zero parameters** (the viewer comes from `auth.uid()`,
so there is nothing to inject and no way to aim it at another user's pool), and
`EXECUTE` revoked from `PUBLIC` and granted only to `authenticated`.

**The remaining cost, stated plainly.** `SECURITY DEFINER` means this one
function is genuinely privileged: inside it, RLS does not apply. The whole
security argument reduces to the correctness of one function that is 60 lines
long and has no inputs. That is a much smaller thing to get right than every
query in the application, which is the point — but it is not nothing, and it is
why the function has no parameters at all.

---

## AD-21 — F3.4's ordering puts availability above score, deliberately.

`order by relaxed asc, score desc` — not `score desc` alone.

The forced F3.4 test made the difference concrete:

```
Test Two        5 days  +2 lvl  1 tag   30 min   score 20.00
Riya Sharma     5 days  +2 lvl  2 tags   0 min   score 21.00   relaxed
Aditya Rao      5 days  +2 lvl  2 tags   0 min   score 21.00   relaxed
```

The two relaxed candidates **score higher** than the genuine match, and are
still ranked below it. Sorting by score alone would have put two people with
**zero overlapping hours** at the top of the list.

That is F3.4 read correctly: relaxation exists to *fill a gap*, not to compete.
Someone you cannot actually meet is not a better match than someone you can,
however well their tags line up. It is the same principle as AD-19 — simultaneity
is a precondition, not a preference — expressed in the sort rather than in the
weights.

**Note also what F3.4 does not relax.** The shared-day requirement stays hard.
Someone free on entirely different days is not a near miss; they are a different
person's schedule.

---

## AD-22 — Two requirements were passing vacuously. Forced them instead.

The first `verify:matches` run reported F3.4 as passing with `3 genuine, 0
relaxed`. That is a pass in the sense that nothing was violated, and worthless
as evidence: the seeded pool is dense enough (by design — F5.2) that relaxation
never fires, so the code path had never executed. F3.6 was worse, because **no
valid intent can produce an empty pool against this seed at all**.

Both are graded requirements. So the suite now constructs the conditions:

- **F3.4** — a probe posts gym `09:00–10:00`, which sits just past the seeded
  morning windows (ending 08:00 / 08:30 / 09:00) and long before the evening
  ones. It shares days with many people and overlapping *hours* with almost
  nobody, producing 1 genuine and 2 relaxed rows.
- **F3.6** — a probe posts a sport intent, then an open request is inserted
  against every sport candidate, emptying the pool through F3.1's own exclusion
  rule rather than by deleting anyone's data.

Both probes are deleted afterwards; their requests cascade.

**The lesson generalises past this phase.** A test that cannot fail proves
nothing, and a *vacuous* pass is harder to spot than a missing test, because it
appears in the output as a green line. When seed data is deliberately generous —
and F5.2 requires exactly that — the edge cases it protects against become the
ones nothing exercises. Worth asking of any suite: which of these checks would
still pass if the feature were deleted?

Related: the F3.4 label and F3.6 copy are now asserted against `docs/PRD.md`
itself rather than against my transcription of it. A paraphrase would be
invisible to every other check here.

---

## AD-23 — OQ-1 resolved: withdrawing auto-declines OUTGOING requests only.

**Decision.** `withdraw_intent()` sets the intent to `withdrawn` and, in the same
transaction, sets to `declined` every pending request sent **from** that intent.
Incoming requests are untouched.

**The principle, in the owner's words:**

> Withdrawing means **"I've stopped looking"**, not **"I refuse everyone who
> already approached me."**

That sentence decides the whole question. Outgoing requests have lost their
subject: F4.3 shows the recipient the *sender's intent details*, and those now
describe a plan that no longer exists. Accepting one would reveal both contact
handles over nothing. Incoming requests reference the *other* person's still-live
intent — someone found you and asked, and answering them is still a coherent
thing to do. Auto-declining those would silently refuse people on the
withdrawer's behalf, which is a materially bigger act than taking down your own
post and one they never asked for.

**Why it is silent, with no new machinery.** F4.6 already establishes that a
decline is silent to the sender. Here the sender *is* the withdrawer — they sent
the request and they chose to withdraw — so there is nobody to notify who does
not already know. The recipient simply sees it leave their list, which is F4.6's
"removed from both views".

**Why one transaction.** Split into two statements, a failure between them
leaves a withdrawn intent with live requests pointing at it — precisely the
state OQ-1 exists to prevent. That moved withdraw from a plain update to a
`SECURITY DEFINER` function, and for the reason AD-18 gives rather than by
preference: the sender **cannot** write those rows directly, because
`requests_update_recipient` deliberately restricts status changes to the
recipient. The operation needs more privilege than the caller has, which is the
test for when a privileged wrapper is justified.

---

## AD-24 — N4 after Phase 6: two shapes that cannot leak, one that cannot leak wrongly.

Until Phase 6, N4 was satisfiable by never returning `contact_handle` at all
(AD-20). This phase has to return it, conditionally, so the guarantee changes
form.

**There are exactly three ways any user can read another user's row.** `users`
keeps the self-only RLS from `0001`, and no cross-user policy has ever been
added. So this is the entire attack surface:

| Function | Returns it? | Why that is guaranteed |
| --- | --- | --- |
| `get_matches()` | no | absent from `RETURNS TABLE` |
| `get_incoming_requests()` | no | absent from `RETURNS TABLE` |
| `get_connections()` | yes | driven **from** `requests where status = 'accepted'` |

**The third one is the interesting one.** The naive version selects `from users`
and bolts on `where exists (accepted request)`. That is a **filter**, and a
filter can be deleted while everything still compiles and runs — exactly the
failure mode AD-10 caught in production, where a column grant looked like
enforcement and silently did nothing.

Instead the query is *about* accepted requests, and finds the person by
following one:

```sql
from public.requests r
join public.users other
  on other.id = case when r.from_user_id = v_user then r.to_user_id
                     else r.from_user_id end
where r.status = 'accepted' and (r.from_user_id = v_user or r.to_user_id = v_user)
```

`users` is not the subject. It is reachable only through the join key an
accepted request supplies. Removing the `status` line does not widen the results
slightly — it changes what the query is about, and stops making sense.

**The `case` expression is what makes F4.5 symmetric.** There is one accepted
row, not one per direction, so neither party can be revealed without the other.
Mutual reveal is a property of the data model rather than of two calls that must
agree.

**Checkable without reading application code:**

```sql
select p.proname from pg_proc p, unnest(p.proargnames) col
 where p.pronamespace = 'public'::regnamespace and col = 'contact_handle';
-- expect exactly one row: get_connections
```

**And proved by attempted violation.** `npm run verify:reveal` tries to obtain
another user's handle in every reachable state — no request, pending (both
directions), declined (both directions), third-party accepted, and after an
OQ-1 auto-decline — by all three routes at once (`get_connections`, stray keys
in the other two functions, and a direct table read). Eight of the nine attempts
must fail; the ninth must succeed for both parties. 26 checks.

**What is deliberately NOT claimed.** `SECURITY DEFINER` means RLS does not
apply inside these functions, so the argument reduces to the correctness of
three functions with two parameters between them. That is a much smaller thing
to get right than every query in the application — which is the point — but it
is not zero, and it is why none of them accepts a `user_id` for the caller.

---

## AD-25 — Test scripts delete only rows they created. Enforced, not remembered.

**The rule.** No script may issue a bare delete on a table, and no script may
delete by a predicate that could match a row it did not create.

**How it came up.** Not from a script — from me. Cleaning up after the Phase 6
browser walkthrough I ran, at a shell prompt:

```js
await admin.from('requests').delete().neq('id','00000000-...')
```

That is a bare delete wearing a `where` clause. It happened to remove exactly
the one row my own test had created, so nothing was lost. Had a real user held a
pending request at that moment, it would have gone, silently, and the next
`verify` run would have looked perfectly healthy.

**The audit that followed found one real instance in committed code.**
`verify-matches.mjs` cleaned up with:

```js
delete().eq("from_user_id", one.id).eq("to_user_id", target.user_id)
```

That reads as scoped and is not. It targets **real seeded users**. A *pending* or
*accepted* request cannot pre-exist for that pair — F3.1 would have kept the
target out of the pool — but a **declined** one can, and F4.6 deliberately leaves
exactly those behind. The script would have deleted someone's real history as a
side effect of testing.

**The fix is structural**, matching how every other invariant in this project is
held. `scripts/lib/tracked-writes.mjs` hands out primary keys on insert and
`cleanup()` iterates only those:

```js
const tracked = trackedWrites(admin);
const id = await tracked.insert("requests", { … });
await tracked.cleanup();   // deletes by primary key, nothing else
```

There is no way to express "delete everything in requests" through it. A check
now asserts the cleanup removed exactly the expected count, so a silent
over-delete would fail the suite rather than pass it.

**When a predicate-scoped delete IS legitimate** — the distinction matters, and
both remaining cases are annotated in place:

| Case | Why it is safe |
| --- | --- |
| `eq("user_id", probe.id)` in `verify-constraints` | the probe was created by this script seconds earlier and is deleted at the end, so every matching row is script-created **by construction** |
| `eq("user_id", id)` in `seed.mjs` | the seed **declares ownership** of its 32 identities and its documented contract is to reset them. It never matches an account outside that list, so real signups keep their data |

**The general lesson.** "Scoped" is not a property of having a `where` clause —
it is a property of the predicate only being able to match rows you own. The
difference is invisible in the code and shows up as missing data much later, in
whatever the test happened to run beside. And test cleanup is the worst place
for it, because a destructive bug there is *reported as a pass*.

Decisions deliberately deferred, recorded so the phase that owns them decides
on purpose rather than inheriting whatever happened by accident.

## OQ-1 — RESOLVED in Phase 6. See AD-23.

Decided as the leading candidate below, with one refinement: **outgoing requests
only**. The reasoning and the sentence that settled it are in AD-23. The original
statement of the question is kept here because the alternatives it weighed are
still the argument for why the answer is right.

---

## OQ-1 (original) — What happens to pending requests when the intent behind them is withdrawn?

**The gap.** F2.5 says a withdrawn intent "disappears from all match pools
immediately". But `requests` rows carry `intent_id`, and F4.3 says the recipient
sees "the sender's name, avatar, tags, **and intent details**". Withdraw an
intent with a pending request against it and the recipient is looking at a card
describing something that no longer exists — and may accept it, revealing both
contact handles over a plan the sender has already abandoned.

The PRD does not say what should happen. Phase 4 does nothing about it: there is
no request UI yet, and the schema supports either answer.

**Leading candidate — withdrawing auto-declines pending requests, silently.**
The sender expressed interest in something that no longer exists, so the request
has lost its subject. F4.6 already establishes that a decline is silent to the
sender ("the card simply returns to neutral"), so this needs no new notification
concept — and V1 has no notifications at all. It also composes correctly with
the rest of the model: `pending → declined` is a legal AD-16 transition, and
F3.1 excludes only *pending or accepted* pairs, so declining frees the pair and
both people can find each other again if the sender posts a fresh intent.

**Alternatives considered.**

- *Leave requests untouched* — a request is arguably about a **person**, not a
  plan; you liked the look of someone's gym schedule, and you might still want
  to train with them. Cheapest to build (nothing to do). Cost: the recipient
  decides based on stale details, which is precisely the trust problem the
  contact-reveal promise depends on.
- *Cascade-delete the requests* — clean state, but destroys history, and
  `requests` rows are the only record that an interaction happened. Also
  inconsistent with how the rest of the schema treats removal: withdrawing an
  intent sets a status rather than deleting a row, and there is no `DELETE`
  policy on either table by design.
- *Block withdrawal while requests are pending* — protects the recipient but
  traps the sender in a commitment they have decided against, which inverts who
  the feature is for.

**Whichever is chosen, it belongs in the database**, in the same transaction as
the withdrawal — otherwise a failure between the two writes leaves a withdrawn
intent with live requests pointing at it. That means withdraw would move from a
plain update to a `SECURITY DEFINER` function, exactly as create did in AD-18,
and for the same reason: it would then need to write rows the caller cannot
write directly (a request where they are `from_user_id`, not the recipient).
