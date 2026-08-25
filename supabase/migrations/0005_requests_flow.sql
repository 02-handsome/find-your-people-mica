-- Phase 6 — request, accept, decline, reveal (PRD F4.1 – F4.7), and OQ-1.
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Idempotent (create or replace), touches no row data.
--
-- ===========================================================================
--  HOW N4 IS ENFORCED
-- ===========================================================================
-- PRD N4: "contact_handle is never returned by any API call unless a request
-- between the two users has status = accepted." The PRD calls this the one
-- security requirement that matters.
--
-- Every phase before this one could satisfy N4 by never returning the column
-- at all. This phase has to return it, conditionally, so the guarantee needs a
-- different shape.
--
-- There are exactly THREE ways any user can read another user's row. `users`
-- keeps the self-only RLS from migration 0001 and no cross-user policy is
-- added anywhere, so this list is the entire attack surface:
--
--   get_matches()            no contact_handle -- absent from RETURNS TABLE
--   get_incoming_requests()  no contact_handle -- absent from RETURNS TABLE
--   get_connections()        RETURNS it, and is driven FROM accepted requests
--
-- The first two are structurally impossible to leak from: the column is not in
-- the output type.
--
-- The third is structurally CONDITIONAL. Note what it selects FROM: it starts
-- at `requests` filtered to status = 'accepted', and reaches `users` only via
-- the join key that the accepted request row supplies. `users` is not the
-- subject of that query. There is no row it can produce without an accepted
-- request, because the accepted request is what finds the person.
--
-- That distinction is the whole point. A function selecting FROM users with
-- "where exists (accepted request)" bolted on would be a FILTER -- and a filter
-- can be edited away without anything failing, which is exactly the failure
-- mode docs/notes.md AD-10 caught in production. Deleting the status line here
-- does not widen the result slightly; it changes what the query is about.


-- ===========================================================================
--  F4.1 — send a connection request
-- ===========================================================================
create or replace function public.send_request(p_to_user_id uuid)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := (select auth.uid());
  v_intent uuid;
  v_row    public.requests;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  if p_to_user_id = v_user then
    raise exception 'CANNOT_REQUEST_SELF' using errcode = 'check_violation';
  end if;

  -- The request carries the SENDER's intent (PRD 4.3), derived here rather
  -- than accepted as a parameter so a caller cannot attribute their request to
  -- someone else's plan. The validate_request_intent trigger enforces the same
  -- rule independently.
  select i.id into v_intent
    from public.intents i
   where i.user_id = v_user
     and i.status = 'active'
     and i.expires_at > now()
   limit 1;

  if v_intent is null then
    raise exception 'NO_ACTIVE_INTENT: post an intent before sending requests'
      using errcode = 'check_violation';
  end if;

  -- F4.1 says "FROM A MATCH CARD". Without this check any signed-in user could
  -- request any user_id they could name, bypassing F3.1's pool entirely. That
  -- is not a contact leak -- nothing is revealed until acceptance -- but it is
  -- unsolicited contact in a product that PRD Q2 admits has no block or report.
  --
  -- get_matches() is itself SECURITY DEFINER and reads auth.uid(), which is a
  -- request-scoped JWT claim rather than a role, so it still resolves to the
  -- original caller when invoked from inside this function.
  if not exists (
    select 1 from public.get_matches() m where m.user_id = p_to_user_id
  ) then
    raise exception 'NOT_A_CURRENT_MATCH: that person is not in your matches right now'
      using errcode = 'check_violation';
  end if;

  -- status defaults to 'pending' (F4.1). The requests_one_open_per_pair unique
  -- index is what actually makes this un-resendable (F4.2).
  insert into public.requests (from_user_id, to_user_id, intent_id)
  values (v_user, p_to_user_id, v_intent)
  returning * into v_row;

  return v_row;
end;
$$;


-- ===========================================================================
--  F4.3 — incoming requests for the recipient's home screen
-- ===========================================================================
create or replace function public.get_incoming_requests()
returns table (
  request_id       uuid,
  from_user_id     uuid,
  name             text,
  year             text,
  tags             text[],
  avatar_url       text,
  activity         public.activity_type,
  days             text[],
  time_start       time,
  time_end         time,
  experience_level public.experience_level,
  requested_at     timestamptz
  -- NO contact_handle. F4.3 lists "name, avatar, tags, and intent details" and
  -- stops there: the whole point of F4.5 is that acceptance is what reveals
  -- contact. Someone deciding whether to accept must not already have it.
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  return query
  select
    r.id, r.from_user_id,
    su.name, su.year, su.tags, su.avatar_url,
    si.activity, si.days, si.time_start, si.time_end, si.experience_level,
    r.created_at
  from public.requests r
  join public.users   su on su.id = r.from_user_id
  join public.intents si on si.id = r.intent_id     -- F4.3: "intent details"
  where r.to_user_id = v_user
    and r.status = 'pending'    -- declined and accepted both leave this list
  order by r.created_at desc;
end;
$$;


-- ===========================================================================
--  F4.5 / F4.7 — the ONLY place contact_handle is ever returned
-- ===========================================================================
create or replace function public.get_connections()
returns table (
  request_id     uuid,
  other_user_id  uuid,
  name           text,
  year           text,
  tags           text[],
  avatar_url     text,
  contact_handle text,
  connected_at   timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  return query
  -- Read the FROM clause before the WHERE clause. This query is ABOUT accepted
  -- requests; the other person is found by following one. `users` cannot be
  -- reached except through a row that is already accepted and already involves
  -- the caller.
  select
    r.id,
    other.id,
    other.name, other.year, other.tags, other.avatar_url,
    other.contact_handle,          -- F4.5: revealed here and nowhere else
    r.created_at
  from public.requests r
  join public.users other
    on other.id = case
                    when r.from_user_id = v_user then r.to_user_id
                    else r.from_user_id
                  end
  where r.status = 'accepted'                                   -- F4.5 / N4
    and (r.from_user_id = v_user or r.to_user_id = v_user)      -- and mine
  order by r.created_at desc;

  -- F4.5 says "BOTH users see the other's contact_handle". The case expression
  -- is what makes this symmetric: whichever side the caller is on, they get the
  -- other. Acceptance is mutual by construction -- there is one row, not one
  -- per direction, so neither party can be revealed without the other.
end;
$$;


-- ===========================================================================
--  F2.5 + OQ-1 — withdraw, and auto-decline the requests that lose their subject
-- ===========================================================================
create or replace function public.withdraw_intent()
returns int    -- how many pending requests were auto-declined
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := (select auth.uid());
  v_intent   uuid;
  v_declined int := 0;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  select i.id into v_intent
    from public.intents i
   where i.user_id = v_user
     and i.status = 'active'
   limit 1;

  if v_intent is null then
    return 0;   -- already withdrawn, or lapsed; the user's goal is already true
  end if;

  -- OQ-1, resolved. See docs/notes.md AD-23.
  --
  -- OUTGOING requests made from this intent are auto-declined. They have lost
  -- their subject: F4.3 shows the recipient the sender's intent details, and
  -- those details now describe a plan that no longer exists. Accepting one
  -- would reveal both contact handles over nothing.
  --
  -- Silent, per F4.6 -- and note that needs no new machinery here, because the
  -- person whose request is declined IS the withdrawer. They sent it and they
  -- chose to withdraw. The recipient simply sees it leave their list, which is
  -- F4.6's "removed from both views".
  --
  -- INCOMING requests are deliberately left alone. Withdrawing means "I have
  -- stopped looking", not "I refuse everyone who already approached me".
  -- Auto-declining those would silently refuse people on the withdrawer's
  -- behalf, which is a materially bigger act than taking down your own post.
  with auto_declined as (
    update public.requests
       set status = 'declined'
     where intent_id     = v_intent
       and from_user_id  = v_user
       and status        = 'pending'
    returning 1
  )
  select count(*) into v_declined from auto_declined;

  -- Same transaction as the declines. Split across two statements, a failure
  -- between them leaves a withdrawn intent with live requests pointing at it --
  -- which is the exact state OQ-1 exists to prevent.
  update public.intents
     set status = 'withdrawn'
   where id = v_intent;

  return v_declined;
end;
$$;


-- ===========================================================================
--  Privileges. EXECUTE is granted to PUBLIC by default; close it explicitly.
-- ===========================================================================
revoke all on function public.send_request(uuid)        from public;
revoke all on function public.get_incoming_requests()   from public;
revoke all on function public.get_connections()         from public;
revoke all on function public.withdraw_intent()         from public;

grant execute on function public.send_request(uuid)      to authenticated;
grant execute on function public.get_incoming_requests() to authenticated;
grant execute on function public.get_connections()       to authenticated;
grant execute on function public.withdraw_intent()       to authenticated;


-- ===========================================================================
--  Verify
-- ===========================================================================
-- contact_handle should appear in exactly ONE function signature:
--
--   select p.proname
--     from pg_proc p, unnest(p.proargnames) col
--    where p.pronamespace = 'public'::regnamespace
--      and col = 'contact_handle';
--   -- expect: get_connections, and nothing else
--
-- Behaviour is proved by scripts/verify-reveal.mjs, which attempts to obtain
-- another user's contact_handle in every reachable request state.
