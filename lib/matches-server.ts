import { cache } from "react";

import type { MatchCandidate } from "@/lib/matches";
import { createClient } from "@/lib/supabase/server";

export type MatchesResult = {
  matches: MatchCandidate[];
  /** True when the query itself failed, as opposed to returning nothing. */
  failed: boolean;
};

/**
 * PRD F3 — the ranked candidate list.
 *
 * All the filtering, scoring and ordering happens inside get_matches(). None of
 * it is reimplemented here, deliberately: a second copy of the rules in
 * TypeScript would be a second thing to keep in step, and the database version
 * is the one that can see other users' rows.
 *
 * `failed` is separated from "empty" on purpose. F3.6's copy — "You're early" —
 * is a claim about the world, and showing it after a query error would be a
 * confident lie. An empty pool and a broken query look identical in an array
 * of length zero, so the distinction has to be carried explicitly.
 */
export const getMatches = cache(async (): Promise<MatchesResult> => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_matches");

  if (error) {
    console.error("get_matches failed:", error.message);
    return { matches: [], failed: true };
  }

  return { matches: (data ?? []) as MatchCandidate[], failed: false };
});
