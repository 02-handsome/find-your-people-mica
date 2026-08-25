-- Phase 3 — intents and requests.
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Idempotent and re-runnable, like 0001. No statement touches row data.
--
-- This completes the three-table schema CLAUDE.md caps the project at:
-- users (0001), intents, requests. Nothing further should be added.


-- ===========================================================================
--  Enum types (PRD 4.2, 4.3)
--
--  Real Postgres enums rather than text + CHECK, because the PRD specifies
--  enums and because the database then rejects an invalid value outright
--  instead of trusting whatever wrote it. CREATE TYPE has no IF NOT EXISTS,
--  hence the DO blocks.
-- ===========================================================================
do $$ begin
  create type public.activity_type as enum ('gym', 'running', 'sport');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.experience_level as enum ('beginner', 'regular', 'serious');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.intent_status as enum ('active', 'withdrawn', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.request_status as enum ('pending', 'accepted', 'declined');
exception when duplicate_object then null; end $$;


-- ===========================================================================
--  intents  (PRD 4.2)
-- ===========================================================================
create table if not exists public.intents (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  activity         public.activity_type not null,
  days             text[] not null,
  time_start       time not null,
  time_end         time not null,
  experience_level public.experience_level not null,
  status           public.intent_status not null default 'active',
  created_at       timestamptz not null default now(),
  -- PRD 4.2: created_at + 7 days.
  expires_at       timestamptz not null default (now() + interval '7 days'),

  constraint intents_days_valid check (
    array_length(days, 1) between 1 and 7
    and days <@ array['Mon','Tue','Wed','Thu','Fri','Sat','Sun']::text[]
  ),

  -- Overnight windows (22:00-02:00) are deliberately not representable. The
  -- PRD's activities are weighted to 6-8am and 6-9pm, and supporting wraparound
  -- would complicate F3.2's time-overlap arithmetic for no realistic gain.
  constraint intents_window_valid check (time_start < time_end),

  constraint intents_expiry_after_creation check (expires_at > created_at)
);

comment on table public.intents is
  'One active intent per user, enforced by the partial unique index below. '
  'Expiry is evaluated on read (status = active AND expires_at > now()), never '
  'by a scheduled job. See docs/notes.md AD-14 for how those two rules interact.';


-- CLAUDE.md hard rule: one active intent per user, enforced in the database
-- rather than remembered by the application.
--
-- Caveat that shapes Phase 4 (docs/notes.md AD-14): because expiry is evaluated
-- on read, an expired intent keeps status = 'active' and therefore still
-- occupies this slot. The create-intent path must flip the caller's own
-- expired-but-active rows to 'expired' before inserting.
create unique index if not exists intents_one_active_per_user
  on public.intents (user_id)
  where status = 'active';

-- The shape every match query in Phase 5 will use (F3.1).
create index if not exists intents_pool_lookup
  on public.intents (activity, status, expires_at);


-- ---------------------------------------------------------------------------
--  Canonical day arrays.
--
--  A CHECK cannot express "no duplicates" without a subquery, so a trigger
--  normalises instead: de-duplicated and sorted Mon->Sun. That also keeps the
--  shared_days count in F3's scoring consistent, and makes rows readable.
-- ---------------------------------------------------------------------------
create or replace function public.normalize_intent_days()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select array_agg(d order by array_position(
           array['Mon','Tue','Wed','Thu','Fri','Sat','Sun']::text[], d))
    into new.days
    from (select distinct unnest(new.days) as d) distinct_days;

  -- An empty input array collapses to NULL here and is then rejected by the
  -- NOT NULL constraint, which is the intended outcome.
  return new;
end;
$$;

drop trigger if exists normalize_intent_days on public.intents;
create trigger normalize_intent_days
  before insert or update on public.intents
  for each row execute function public.normalize_intent_days();


-- ---------------------------------------------------------------------------
--  Immutable fields on an intent.
--
--  F2.4 lists what may be edited: days, time window, experience level. Not
--  `activity` -- changing it would move a user into a different match pool
--  (it is F3.1's hard filter) while their existing requests dangled. And
--  F2.4 is explicit that expires_at does not reset on edit.
--
--  The column grants below already prevent this. This trigger is the
--  belt-and-braces AD-10 taught us to add: grants are configuration and easy
--  to get subtly wrong, triggers are not.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_intent_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'INTENT_USER_IMMUTABLE' using errcode = 'check_violation';
  end if;
  if new.activity is distinct from old.activity then
    raise exception 'INTENT_ACTIVITY_IMMUTABLE: withdraw and post a new intent to change activity'
      using errcode = 'check_violation';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'INTENT_CREATED_AT_IMMUTABLE' using errcode = 'check_violation';
  end if;
  if new.expires_at is distinct from old.expires_at then
    raise exception 'INTENT_EXPIRES_AT_IMMUTABLE: F2.4 -- expires_at does not reset on edit'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_intent_identity_change on public.intents;
create trigger prevent_intent_identity_change
  before update on public.intents
  for each row execute function public.prevent_intent_identity_change();


-- ---------------------------------------------------------------------------
--  Legal status transitions.
--
--  `status` must be user-writable so withdrawal works (F2.5), and the enum
--  type limits it to three VALUES -- but an enum says nothing about DIRECTION.
--  Without this trigger a user could:
--
--    * mark a live intent 'expired', which is a lie: it vanishes from match
--      pools while claiming time ran out, destroying the distinction between
--      "the user withdrew" and "it lapsed";
--    * flip 'withdrawn' back to 'active', so F2.5's "withdrawn intents
--      disappear from all match pools immediately" becomes a toggle rather
--      than a commitment;
--    * flip 'expired' back to 'active' and re-occupy the one-active-intent
--      slot below, locking themselves out of posting a new intent.
--
--  The PRD's machine is narrow. From 'active': -> 'withdrawn' (F2.5) or
--  -> 'expired' (lazy expiry, AD-14). Both are terminal, because F2.2 makes a
--  replacement intent a NEW ROW rather than a revived one.
--
--    active ──> withdrawn   (terminal)
--      └──────> expired     (terminal, and only once expires_at has passed)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_intent_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if old.status <> 'active' then
    raise exception
      'INTENT_STATUS_TERMINAL: % is terminal; post a new intent instead of moving it to %',
      old.status, new.status
      using errcode = 'check_violation';
  end if;

  if new.status = 'withdrawn' then
    return new;
  end if;

  if new.status = 'expired' then
    -- Lazy expiry may only RECORD what is already true, never bring it about.
    if old.expires_at > now() then
      raise exception
        'INTENT_NOT_YET_EXPIRED: cannot mark an intent expired before expires_at (%); withdraw it instead',
        old.expires_at
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  raise exception 'INTENT_STATUS_TRANSITION_INVALID: % -> %', old.status, new.status
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists enforce_intent_status_transition on public.intents;
create trigger enforce_intent_status_transition
  before update on public.intents
  for each row execute function public.enforce_intent_status_transition();


-- ---------------------------------------------------------------------------
--  RLS — own intents only. No cross-user read policy, deliberately.
--
--  Phase 5 needs match cards. Those must arrive as a SECURITY DEFINER function
--  whose RETURNS TABLE list has no contact_handle column at all, so PRD N4 is
--  enforced by the function signature and cannot be widened by accident.
--  Opening narrowly later is reviewable; opening now is not.
-- ---------------------------------------------------------------------------
alter table public.intents enable row level security;

drop policy if exists intents_select_own on public.intents;
create policy intents_select_own on public.intents
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists intents_insert_own on public.intents;
create policy intents_insert_own on public.intents
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists intents_update_own on public.intents;
create policy intents_update_own on public.intents
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No DELETE policy: F2.5 withdraws an intent by setting status = 'withdrawn'.
-- Rows are never removed, so a withdrawn intent stays auditable.


-- ---------------------------------------------------------------------------
--  Privileges.
--
--  Every grant revokes first. AD-10: Supabase's default privileges already
--  grant ALL on public tables to `authenticated`, and a column-level GRANT only
--  ADDS privileges -- it cannot narrow a table-wide one that already exists.
--
--  INSERT is column-scoped too, not just UPDATE. With a table-wide INSERT grant
--  a user could set their own expires_at and hand themselves a ten-year intent.
--  Restricting the column list forces status, created_at and expires_at to take
--  their defaults.
-- ---------------------------------------------------------------------------
revoke all on public.intents from anon;
revoke insert, update on public.intents from authenticated;

grant select on public.intents to authenticated;

grant insert (user_id, activity, days, time_start, time_end, experience_level)
  on public.intents to authenticated;

-- Exactly F2.4's editable set, plus status for withdrawal (F2.5).
grant update (days, time_start, time_end, experience_level, status)
  on public.intents to authenticated;


-- ===========================================================================
--  requests  (PRD 4.3)
-- ===========================================================================
create table if not exists public.requests (
  id           uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.users(id) on delete cascade,
  to_user_id   uuid not null references public.users(id) on delete cascade,
  intent_id    uuid not null references public.intents(id) on delete cascade,
  status       public.request_status not null default 'pending',
  created_at   timestamptz not null default now(),

  constraint requests_no_self check (from_user_id <> to_user_id)
);

-- PRD 4.3: "one pending or accepted request per (from_user_id, to_user_id)".
--
-- Note this is DIRECTIONAL, exactly as worded: A->B pending does not block
-- B->A. F3.1 separately excludes candidates with a pending or accepted request
-- "between the pair", which reads as bidirectional. Both are correct -- the
-- constraint is per-direction, the match query filters both directions. Phase 5
-- must not assume this index covers that.
create unique index if not exists requests_one_open_per_pair
  on public.requests (from_user_id, to_user_id)
  where status in ('pending', 'accepted');

create index if not exists requests_incoming
  on public.requests (to_user_id, status);


-- PRD 4.3 describes intent_id as "the sender's intent". Enforced here because
-- a CHECK constraint cannot contain a subquery.
create or replace function public.validate_request_intent()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.intents i
     where i.id = new.intent_id
       and i.user_id = new.from_user_id
  ) then
    raise exception 'REQUEST_INTENT_NOT_SENDERS: intent_id must belong to from_user_id'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_request_intent on public.requests;
create trigger validate_request_intent
  before insert on public.requests
  for each row execute function public.validate_request_intent();


-- ---------------------------------------------------------------------------
--  Legal request transitions.
--
--  Same reasoning as the intent trigger: the recipient must be able to write
--  `status` in order to accept or decline (F4.4), and the enum limits the
--  values but not the direction. Without this:
--
--    * declined -> accepted would revive a refusal the sender was never told
--      about (F4.6 says a decline is silent), and contacts would be revealed
--      after the recipient had already said no;
--    * accepted -> pending/declined would "un-reveal" a contact_handle the
--      other party has already seen, which the data can no longer undo.
--
--    pending ──> accepted   (terminal — reveals contact, F4.5)
--       └──────> declined   (terminal — silent to the sender, F4.6)
--
--  Both terminal states are final, so a fresh attempt is a NEW row. That is
--  consistent with F3.1, which only excludes candidates with a PENDING or
--  ACCEPTED request: after a decline the pair is eligible again, which is
--  exactly F4.6's "the card simply returns to neutral".
--
--  Note for a real deployment: `accepted` being terminal means there is no
--  un-match. V1 has no block or report either (PRD Q2 acknowledges this), and
--  both would be required before this went anywhere near real students.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_request_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if old.status <> 'pending' then
    raise exception
      'REQUEST_STATUS_TERMINAL: % is final; send a new request instead of moving it to %',
      old.status, new.status
      using errcode = 'check_violation';
  end if;

  if new.status in ('accepted', 'declined') then
    return new;
  end if;

  raise exception 'REQUEST_STATUS_TRANSITION_INVALID: % -> %', old.status, new.status
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists enforce_request_status_transition on public.requests;
create trigger enforce_request_status_transition
  before update on public.requests
  for each row execute function public.enforce_request_status_transition();


-- ---------------------------------------------------------------------------
--  RLS — visible to both parties, created by the sender, resolved by the
--  recipient (F4.1, F4.4).
-- ---------------------------------------------------------------------------
alter table public.requests enable row level security;

drop policy if exists requests_select_involved on public.requests;
create policy requests_select_involved on public.requests
  for select to authenticated
  using ((select auth.uid()) in (from_user_id, to_user_id));

drop policy if exists requests_insert_sender on public.requests;
create policy requests_insert_sender on public.requests
  for insert to authenticated
  with check ((select auth.uid()) = from_user_id);

-- Only the recipient accepts or declines. The sender cannot cancel: the PRD
-- has no cancel action, and F4.6 says a decline simply returns the card to
-- neutral without telling the sender.
drop policy if exists requests_update_recipient on public.requests;
create policy requests_update_recipient on public.requests
  for update to authenticated
  using ((select auth.uid()) = to_user_id)
  with check ((select auth.uid()) = to_user_id);


revoke all on public.requests from anon;
revoke insert, update on public.requests from authenticated;

grant select on public.requests to authenticated;
grant insert (from_user_id, to_user_id, intent_id) on public.requests to authenticated;
grant update (status) on public.requests to authenticated;


-- ===========================================================================
--  Verify
-- ===========================================================================
-- Which columns can `authenticated` actually write? Expect only the profile /
-- editable sets, and nothing resembling expires_at, created_at or activity:
--
--   select table_name, privilege_type, column_name
--     from information_schema.column_privileges
--    where grantee = 'authenticated'
--      and table_name in ('users','intents','requests')
--      and privilege_type in ('INSERT','UPDATE')
--    order by table_name, privilege_type, column_name;
--
-- One active intent per user:
--   select user_id, count(*) from public.intents
--    where status = 'active' group by user_id having count(*) > 1;   -- expect 0 rows
