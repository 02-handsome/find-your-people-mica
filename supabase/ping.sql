-- Keep-alive target for the daily GitHub Actions job.
--
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Re-runnable: `create or replace` makes it safe to apply again.
--
-- Why a function instead of a table (see docs/notes.md, AD-3):
--   * CLAUDE.md caps the schema at three tables. A monitoring table would be a
--     fourth, and there is no schema at all until Phase 3 anyway.
--   * Hitting `/rest/v1/` instead would return PostgREST's *cached* OpenAPI
--     schema and might never reach Postgres — green forever while the database
--     slept.
--   * An RPC call makes PostgREST run a real SELECT inside Postgres, which is
--     what actually resets the free-tier inactivity timer.

create or replace function public.ping()
returns text
language sql
stable
-- Empty search_path keeps Supabase's security advisor quiet: a function with a
-- mutable search_path can be hijacked by a caller-controlled schema. Irrelevant
-- for a constant, but there is no reason to ship a warning.
set search_path = ''
as $$ select 'pong'::text $$;

-- `anon` is the role the publishable key authenticates as. Granting execute is
-- what lets the workflow call this without a secret key. Safe: the function
-- takes no input and reads no data.
grant execute on function public.ping() to anon;

-- Verify:
--   select public.ping();   -- expect: pong
