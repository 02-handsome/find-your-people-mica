-- Phase 2 — auth, campus domain validation, and the users profile table.
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Re-runnable: every statement is idempotent.
--
-- Only `users` is created here. `intents` and `requests` belong to Phase 3
-- (docs/PRD.md section 9), and CLAUDE.md caps the schema at those three.


-- ===========================================================================
--  THE CAMPUS EMAIL ALLOWLIST — THE ONLY PLACE TO EDIT PERMITTED DOMAINS.
--
--  To let a grader in: add their domain to the array below and re-run just
--  this function. Nothing in the application code needs to change.
--
--  This lives in Postgres rather than TypeScript deliberately. The publishable
--  key is public by design (it ships in the browser bundle), so anyone can call
--  POST /auth/v1/signup directly and skip our Server Action entirely. An
--  application-layer check is therefore cosmetic; the database is the only
--  enforceable gate. See docs/notes.md, AD-5.
-- ===========================================================================
create or replace function public.allowed_email_domains()
returns text[]
language sql
immutable
set search_path = ''
as $$ select array['micamail.in', 'mica.ac.in'] $$;

comment on function public.allowed_email_domains() is
  'Single source of truth for PRD F1.2 campus domains. Edit here and nowhere else.';


-- Does this address sit on an allowed campus domain?
-- Read by the signup Server Action (for the F1.2 message) and by the
-- enforcement trigger below (for the actual gate).
create or replace function public.is_email_allowed(email text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(split_part(coalesce(email, ''), '@', 2))
         = any (public.allowed_email_domains())
$$;

grant execute on function public.allowed_email_domains() to anon, authenticated;
grant execute on function public.is_email_allowed(text) to anon, authenticated;


-- ===========================================================================
--  users  (PRD 4.1)
-- ===========================================================================
create table if not exists public.users (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null unique,
  name           text,
  year           text,
  tags           text[],
  avatar_url     text,
  contact_handle text,
  created_at     timestamptz not null default now(),

  -- PRD 4.1: tags are "Exactly 3, from a fixed list". Null while the profile
  -- is still being completed; once set, exactly three. Membership in the fixed
  -- list is checked in the Server Action — a CHECK constraint calling a
  -- function is not re-validated when that function changes, which would be a
  -- trap dressed as a safeguard.
  constraint users_tags_exactly_three
    check (tags is null or array_length(tags, 1) = 3)
);

comment on column public.users.contact_handle is
  'PRD N4: must never be returned to anyone but the owner until a request '
  'between the two users is accepted. No cross-user read policy exists yet — '
  'Phase 5 must expose match cards through a view/RPC that omits this column.';


-- ---------------------------------------------------------------------------
--  Row Level Security — closed by default, self-access only.
--
--  There is deliberately NO policy granting read access to anyone else's row.
--  Phase 5 needs match cards; that must arrive as a view or RPC which omits
--  contact_handle, so PRD N4 is enforced by the shape of the API rather than
--  by remembering to filter. Starting closed and opening narrowly is
--  reviewable. Starting open is not.
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;

drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- `(select auth.uid())` rather than a bare `auth.uid()`: Postgres caches the
-- scalar subquery once per statement instead of re-evaluating it per row.

-- No INSERT policy: the trigger below inserts as SECURITY DEFINER.
-- No DELETE policy: account deletion is not a V1 feature.


-- ---------------------------------------------------------------------------
--  Privileges. RLS filters rows; grants decide which COLUMNS are reachable.
-- ---------------------------------------------------------------------------
revoke all on public.users from anon;

-- The revoke below is load-bearing and MUST come before the column grant.
--
-- Supabase's default privileges already grant ALL on tables in `public` to
-- `authenticated`. A column-level GRANT only ADDS privileges — it cannot narrow
-- a table-wide grant that already exists. Without this line, the column list
-- below is decorative: an authenticated user can PATCH their own `email` and
-- escape the F1.2 domain gate after signing up.
--
-- This was found by testing, not by reading — the first version of this file
-- had the column grant without the revoke and the escalation succeeded. See
-- docs/notes.md AD-10.
revoke update on public.users from authenticated;

grant select on public.users to authenticated;
grant update (name, year, tags, contact_handle) on public.users to authenticated;


-- ===========================================================================
--  Trigger 1 — enforce the campus domain (PRD F1.2). THE REAL GATE.
-- ===========================================================================
create or replace function public.enforce_campus_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_email_allowed(new.email) then
    -- Supabase Auth flattens this into an opaque 500, which is why the signup
    -- Server Action pre-checks via is_email_allowed() to produce the friendly
    -- F1.2 copy. This raise is the guarantee, not the user-facing message.
    raise exception 'CAMPUS_DOMAIN_NOT_ALLOWED: %', new.email
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_campus_email on auth.users;
create trigger enforce_campus_email
  before insert on auth.users
  for each row execute function public.enforce_campus_email();


-- ===========================================================================
--  Trigger 2 — create the profile row the instant the auth user exists.
--
--  Guarantees there is never a signed-in user without a users row, which
--  removes a whole class of null-handling from the UI. Profile columns stay
--  null until screen 2 fills them; "complete" is derived from those columns,
--  never stored, so there is no flag that can go stale.
-- ===========================================================================
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, avatar_url)
  values (
    new.id,
    new.email,
    -- PRD F1.4: generated from the user id, never uploaded.
    'https://api.dicebear.com/9.x/thumbs/svg?seed=' || new.id::text
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_profile_for_new_user on auth.users;
create trigger create_profile_for_new_user
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();


-- ===========================================================================
--  Trigger 3 — identity columns are immutable after the row is created.
--
--  Defence in depth for the grant above, and deliberately not reliant on it.
--  Privilege configuration is easy to get subtly wrong — this file shipped
--  exactly such a mistake once — whereas a trigger holds regardless of which
--  role is connected or what it was granted.
--
--  Note: this is strict on purpose. Correcting an email by hand means dropping
--  the trigger, changing the row, and recreating it. That is the intended cost;
--  `email` is set from auth.users at signup and should never drift from it.
-- ===========================================================================
create or replace function public.prevent_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'ID_IMMUTABLE: users.id cannot be changed'
      using errcode = 'check_violation';
  end if;
  if new.email is distinct from old.email then
    raise exception 'EMAIL_IMMUTABLE: users.email is set at signup and cannot be changed'
      using errcode = 'check_violation';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'CREATED_AT_IMMUTABLE: users.created_at cannot be changed'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_identity_change on public.users;
create trigger prevent_identity_change
  before update on public.users
  for each row execute function public.prevent_identity_change();


-- ===========================================================================
--  Verify
-- ===========================================================================
--   select public.allowed_email_domains();               -- {micamail.in,mica.ac.in}
--   select public.is_email_allowed('a@micamail.in');     -- true
--   select public.is_email_allowed('a@gmail.com');       -- false
--
-- Confirm the update privilege is actually narrowed (expect only the four
-- profile columns, NOT email / id / created_at):
--   select column_name from information_schema.column_privileges
--    where table_name = 'users' and privilege_type = 'UPDATE' and grantee = 'authenticated'
--    order by column_name;
