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
