-- Phase 5 — the match query (PRD F3.1 – F3.5).
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Idempotent (create or replace), touches no row data.
--
-- ===========================================================================
--  WHY THIS IS A FUNCTION AND NOT A POLICY
-- ===========================================================================
-- Every phase so far has kept `users` closed: RLS lets a caller read only
-- their OWN row, and no cross-user read policy exists anywhere. Showing match
-- cards needs other people's name, year, tags and avatar, so something has to
-- open — and how it opens is the most important decision in this phase.
--
-- PRD N4: "contact_handle is never returned by any API call unless a request
-- between the two users has status = accepted."
--
-- The guarantee here is STRUCTURAL. The RETURNS TABLE list below has no
-- contact_handle column, so no query in the body, no later edit to the final
-- SELECT, and no client mistake can produce one. Leaking it would require
-- adding a column to this signature — a visible, reviewable act — rather than
-- forgetting a filter. That is the difference between N4 being enforced and
-- N4 being remembered.
--
-- Supporting properties:
--   * ZERO PARAMETERS. The viewer comes from auth.uid(). There is nothing to
--     inject and no argument that could aim this at someone else's pool.
--   * EXECUTE revoked from PUBLIC, granted only to `authenticated`.
--   * The RLS policies on `users` and `intents` are UNCHANGED. This function
--     reaches past them in exactly one place, with a fixed output shape.


create or replace function public.get_matches()
returns table (
  intent_id            uuid,
  user_id              uuid,
  name                 text,
  year                 text,
  tags                 text[],
  avatar_url           text,
  activity             public.activity_type,
  days                 text[],
  time_start           time,
  time_end             time,
  experience_level     public.experience_level,
  score                numeric,
  shared_days          int,
  time_overlap_minutes int,
  relaxed              boolean
  -- NO contact_handle. This omission is the N4 guarantee. Do not add it.
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
    raise exception 'NOT_AUTHENTICATED: get_matches requires a signed-in caller'
      using errcode = '28000';
  end if;

  return query
  -- The caller's own live intent. Everything is measured against this.
  -- No live intent -> no rows -> the UI sends them to post one.
  with viewer as (
    select
      i.activity                      as activity,
      i.days                          as days,
      i.time_start                    as time_start,
      i.time_end                      as time_end,
      i.experience_level              as experience_level,
      coalesce(u.tags, '{}'::text[])  as tags
    from public.intents i
    join public.users u on u.id = i.user_id
    where i.user_id = v_user
      and i.status = 'active'
      and i.expires_at > now()          -- F2.6: expiry evaluated on read
    limit 1
  ),

  -- F3.1 — the candidate pool.
  candidates as (
    select
      c.id                             as c_intent_id,
      c.user_id                        as c_user_id,
      cu.name                          as c_name,
      cu.year                          as c_year,
      coalesce(cu.tags, '{}'::text[])  as c_tags,
      cu.avatar_url                    as c_avatar_url,
      c.activity                       as c_activity,
      c.days                           as c_days,
      c.time_start                     as c_time_start,
      c.time_end                       as c_time_end,
      c.experience_level               as c_level,

      -- How many days both people picked. Days are stored de-duplicated and
      -- sorted by the normalize_intent_days trigger, so a plain count is right.
      (select count(*) from unnest(c.days) d where d = any(v.days))::int
                                       as c_shared_days,

      -- Minutes the two windows overlap.
      --   least(ends) - greatest(starts)  is the intersection.
      -- Subtracting two `time` values yields an INTERVAL, so epoch converts it
      -- to seconds before dividing. greatest(0, ...) floors a negative result
      -- (windows that do not touch at all) to zero.
      greatest(0, floor(extract(epoch from (
        least(c.time_end, v.time_end) - greatest(c.time_start, v.time_start)
      )) / 60))::int                   as c_overlap_min,

      -- Shared profile tags. coalesce on both sides: tags are nullable while a
      -- profile is still being completed, and `= any(null)` would yield null,
      -- silently dropping the candidate rather than scoring them zero.
      (select count(*) from unnest(coalesce(cu.tags, '{}'::text[])) t
        where t = any(v.tags))::int    as c_tag_overlap,

      (c.experience_level = v.experience_level) as c_level_match

    from viewer v
    join public.intents c
      on  c.activity   = v.activity     -- F3.1: same activity (the hard filter)
      and c.status     = 'active'       -- F3.1: active
      and c.expires_at > now()          -- F3.1: not expired
      and c.user_id   <> v_user         -- F3.1: not the viewer
    join public.users cu on cu.id = c.user_id

    -- F3.1: "no existing pending or accepted request between the pair".
    --
    -- BETWEEN, so both directions. Note this is deliberately WIDER than the
    -- requests_one_open_per_pair unique index, which is directional because
    -- PRD 4.3 words the constraint that way. The index would not have excluded
    -- someone who had already requested the viewer.
    where not exists (
      select 1 from public.requests r
      where r.status in ('pending', 'accepted')
        and (
             (r.from_user_id = v_user    and r.to_user_id = c.user_id)
          or (r.from_user_id = c.user_id and r.to_user_id = v_user)
        )
    )
  ),

  -- F3.2 and the scoring formula from PRD section 5.
  scored as (
    select
      cand.*,
      (cand.c_shared_days * 3)
        + (case when cand.c_level_match then 2 else 0 end)
        + (cand.c_tag_overlap * 2)
        + (cand.c_overlap_min / 30.0)   -- 30.0, not 30: integer division here
                                        -- would truncate a 45-minute overlap
                                        -- to 1 point instead of 1.5.
                                        as c_score,
      (cand.c_overlap_min = 0)          as c_relaxed
    from candidates cand
    -- F3.2's day requirement, which F3.4 does NOT relax — only the time
    -- overlap is relaxed. Someone free on entirely different days is not a
    -- near miss, they are a different person's schedule.
    where cand.c_shared_days >= 1
  )

  select
    s.c_intent_id, s.c_user_id, s.c_name, s.c_year, s.c_tags, s.c_avatar_url,
    s.c_activity, s.c_days, s.c_time_start, s.c_time_end, s.c_level,
    s.c_score, s.c_shared_days, s.c_overlap_min, s.c_relaxed
  from scored s
  -- F3.3 top 3, and F3.4 falls out of the sort rather than needing a branch:
  -- `relaxed asc` puts genuine matches (false) ahead of near misses (true), so
  -- relaxed rows can only ever FILL A GAP, never displace a real match. That is
  -- exactly "if fewer than 3 pass the hard filter, relax the time-overlap
  -- requirement".
  --
  -- c_intent_id is a final tiebreaker purely so the order is deterministic and
  -- therefore testable; without it, equal scores could come back in any order.
  order by s.c_relaxed asc, s.c_score desc, s.c_intent_id asc
  limit 3;

  -- F3.5 — "Existing friends are not modelled in V1." Nothing to implement.
  -- Stated so its absence reads as a decision rather than an oversight: there
  -- is no social graph to filter against, so ranking makes no attempt to avoid
  -- people the viewer already knows.
end;
$$;


revoke all on function public.get_matches() from public;
grant execute on function public.get_matches() to authenticated;


-- ===========================================================================
--  Verify
-- ===========================================================================
-- The N4 guarantee is checkable from the catalog — no contact_handle should
-- appear in the output columns:
--
--   select p.proname, unnest(p.proargnames) as col
--     from pg_proc p where p.proname = 'get_matches';
--
-- Behaviour is verified by scripts/verify-matches.mjs, which recomputes the
-- whole of F3 independently in JavaScript and asserts both implementations
-- agree on rows, order and scores.
