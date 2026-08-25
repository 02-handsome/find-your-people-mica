-- Phase 4 — atomic intent creation.
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Idempotent (create or replace), touches no row data.
--
-- Solves docs/notes.md AD-14, where two CLAUDE.md hard rules meet:
--
--   "One active intent per user. Enforce it."
--       -> partial unique index on (user_id) where status = 'active'
--   "Expiry on read, not cron."
--       -> an expired intent keeps status = 'active' with a past expires_at
--
-- Together, a user whose intent lapsed still occupies the unique slot, so a
-- plain INSERT of a replacement fails on the index. Nothing ever transitions
-- active -> expired.
--
-- The fix is lazy cleanup at WRITE time, in one transaction with the insert.
-- That is not what the rule forbids: it bars a SCHEDULED JOB, and this runs
-- only because a user asked for a new intent. Reads keep filtering on both
-- columns regardless, so correctness never depends on this having run.


create or replace function public.create_intent(
  p_activity         public.activity_type,
  p_days             text[],
  p_time_start       time,
  p_time_end         time,
  p_experience_level public.experience_level
)
returns public.intents
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_row  public.intents;
begin
  -- SECURITY DEFINER runs as the function owner, which bypasses RLS AND the
  -- column grants from AD-15. So this function is a privileged path, and the
  -- caller's identity is taken from the verified JWT — never from an argument.
  --
  -- Note what is deliberately NOT a parameter: user_id, status, expires_at.
  -- There is no value a caller could pass to write a row for someone else or
  -- to hand themselves a ten-year intent. The column-grant protection is
  -- preserved by the signature rather than routed around by it.
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED: create_intent requires a signed-in caller'
      using errcode = '28000';
  end if;

  -- AD-14: lazy cleanup. Only ever marks rows that are ALREADY past their
  -- expires_at, so it records what is true rather than bringing it about --
  -- which is also what the AD-16 status-transition trigger permits.
  update public.intents
     set status = 'expired'
   where user_id = v_user
     and status = 'active'
     and expires_at <= now();

  -- F2.2: one active intent per user. Checked here so the caller gets a
  -- meaningful error instead of a raw unique-violation from the index, which
  -- still stands behind this as the real guarantee.
  if exists (
    select 1 from public.intents
     where user_id = v_user and status = 'active' and expires_at > now()
  ) then
    raise exception 'INTENT_ALREADY_ACTIVE: withdraw the current intent before posting another'
      using errcode = 'check_violation';
  end if;

  -- status and expires_at take their column defaults: 'active' and
  -- now() + 7 days (F2.1).
  insert into public.intents
    (user_id, activity, days, time_start, time_end, experience_level)
  values
    (v_user, p_activity, p_days, p_time_start, p_time_end, p_experience_level)
  returning * into v_row;

  return v_row;
end;
$$;


-- EXECUTE on new functions is granted to PUBLIC by default. For a
-- SECURITY DEFINER function that is worth closing explicitly, even though an
-- anonymous caller would hit the NOT_AUTHENTICATED guard above.
revoke all on function public.create_intent(
  public.activity_type, text[], time, time, public.experience_level
) from public;

grant execute on function public.create_intent(
  public.activity_type, text[], time, time, public.experience_level
) to authenticated;


-- ===========================================================================
--  Verify
-- ===========================================================================
-- As a signed-in user, posting when a live intent already exists:
--   select public.create_intent('gym', array['Mon'], '06:00', '08:00', 'regular');
--   -- expect: INTENT_ALREADY_ACTIVE
--
-- Nobody but `authenticated` can call it:
--   select proname, proacl from pg_proc where proname = 'create_intent';
