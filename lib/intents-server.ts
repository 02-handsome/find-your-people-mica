import { cache } from "react";

import { getUserId } from "@/lib/auth";
import type { Intent } from "@/lib/intents";
import { createClient } from "@/lib/supabase/server";

/**
 * The caller's live intent, or null.
 *
 * PRD F2.6 — expiry is handled ON READ. This filters `status = 'active'` AND
 * `expires_at > now()`, which is the whole mechanism: there is no scheduled job
 * flipping rows, so a lapsed intent is one that still says 'active' and is
 * simply filtered out here.
 *
 * Note it filters and does NOT mutate. Tidying rows during a page render would
 * give a GET side effects; the cleanup belongs on the write path, where the
 * user actually asked for something — see create_intent() and AD-14.
 *
 * cache() dedupes across the layout and the page within one request.
 */
export const getActiveIntent = cache(async (): Promise<Intent | null> => {
  const userId = await getUserId();
  if (!userId) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("intents")
    .select(
      "id, user_id, activity, days, time_start, time_end, experience_level, status, created_at, expires_at"
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  // Same reasoning as getProfile: a failed query is not "no intent". Returning
  // null on error made /matches silently redirect home and made home announce
  // "No active intent" — telling the user their post had gone when the truth was
  // that we could not read it. Throwing routes it to app/error.tsx instead.
  if (error) {
    throw new Error(`Could not load your intent: ${error.message}`);
  }

  return (data as Intent | null) ?? null;
});
