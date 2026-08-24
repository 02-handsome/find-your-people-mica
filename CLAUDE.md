# Find Your People

A verified campus app where students post what activity they're looking
for a partner for, and get matched with a small number of people who
posted the same thing. Contact details are revealed only after both
sides agree.

Full spec: `docs/PRD.md` — read it before making changes.

## Stack

- Next.js (App Router) + TypeScript
- Supabase (Postgres + Auth)
- Tailwind CSS
- Deployed on Vercel, auto-deploys from GitHub main branch

## Hard Rules

- **Three tables only:** `users`, `intents`, `requests`. Do not add more.
- **Contact privacy:** a user's `contact_handle` must NEVER be returned
  by any query or API response unless a request between those two users
  has `status = 'accepted'`. This is the core promise of the product.
- **One active intent per user** at any time. Enforce it.
- **Expiry on read, not cron:** filter `status = 'active' AND
  expires_at > now()`. Do not build a scheduled job for this.
- **Never a blank screen.** Every list has a designed empty state.
- **Mobile first.** Design at 375px wide, then scale up.

## Build Discipline

- Follow the phases in `docs/PRD.md` section 9, in order.
- **Build only the phase I ask for.** Do not build ahead, even if the
  next phase seems obvious or trivial.
- Plan first, show me the plan, wait for approval before writing code.
- Explain your decisions as you go — I have to present this work and
  defend the architecture, so I need to understand every piece.
- Prefer boring, readable code over clever code.

## Scope — Explicitly Not Building

In-app chat. Multiple simultaneous intents. Photo uploads. Push or email
notifications. Multi-campus support. Native mobile apps. Non-activity
intent categories.

If a feature isn't in the PRD, ask before building it.
