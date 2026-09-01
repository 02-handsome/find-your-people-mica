-- 0006 — the contact handle format, enforced where it cannot be walked past.
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Idempotent (drops the constraint first), touches no row data.
--
-- ===========================================================================
--  WHY THIS EXISTS
-- ===========================================================================
-- `isValidContactHandle()` in lib/profile-options.ts has always required a
-- 10-digit Indian mobile with an optional +91 / 91 / 0 prefix, and the profile
-- Server Action has always rejected anything else. That check is real, and it
-- is also bypassable.
--
-- The publishable key ships in the browser bundle by design, and
-- `0001_users.sql` grants UPDATE (name, year, tags, contact_handle) to
-- `authenticated`. So a signed-in user can PATCH the column directly through
-- PostgREST and never touch the Server Action. Demonstrated, not assumed:
--
--   PATCH /rest/v1/users?id=eq.<own id>  {"contact_handle":"not-a-phone-number-at-all"}
--   -> 200, stored verbatim
--
-- This is the third time the same shape of hole has turned up here. AD-5: a
-- domain check in TypeScript that a direct API call walks past. AD-10: a
-- column grant that looked like enforcement and silently did nothing. The
-- lesson each time is that the database is the only layer an attacker cannot
-- route around, so that is where a rule has to live.
--
-- The stakes are lower than either of those — a malformed handle inconveniences
-- whoever accepts your request rather than leaking anything — but the failure
-- is silent and unrecoverable in the same way AD-11 describes: the reveal hands
-- out a number that does not dial, both sides think the other is ignoring them,
-- and nothing in the product says otherwise.
--
-- ===========================================================================
--  WHAT IT ALLOWS
-- ===========================================================================
-- NULL, because a profile is incomplete until screen 2 fills it and
-- `isProfileComplete()` derives completeness from the columns rather than a
-- stored flag.
--
-- Otherwise the NORMALISED form only. The Server Action stores
-- `normalizeContactHandle()`, which strips spaces, parentheses and hyphens
-- before writing, so a stored value never contains them and the constraint
-- does not need to allow them. Anything arriving by another route is held to
-- the same shape.
--
-- Verified against live data before adding: 33 rows, 33 non-null handles,
-- 0 that this would reject.
-- ===========================================================================

alter table public.users
  drop constraint if exists users_contact_handle_valid;

alter table public.users
  add constraint users_contact_handle_valid check (
    contact_handle is null
    or contact_handle ~ '^(\+91|91|0)?[6-9][0-9]{9}$'
  );

comment on constraint users_contact_handle_valid on public.users is
  'PRD 4.1 contact handle: a 10-digit Indian mobile, optional +91/91/0 prefix, '
  'stored normalised. Mirrors isValidContactHandle() in lib/profile-options.ts. '
  'The TypeScript check produces the friendly message; this one is the guarantee.';
