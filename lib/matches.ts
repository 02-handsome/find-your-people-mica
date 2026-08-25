import type { Activity, Day, ExperienceLevel } from "@/lib/intents";

/**
 * One row from public.get_matches().
 *
 * Mirrors that function's RETURNS TABLE exactly — and, like it, has no
 * `contact_handle`. PRD N4 is enforced by the function's signature; this type
 * simply reflects it. If a field is ever needed here that the function does not
 * return, the fix is to think hard about the function, not to widen this type.
 */
export type MatchCandidate = {
  intent_id: string;
  user_id: string;
  name: string | null;
  year: string | null;
  tags: string[] | null;
  avatar_url: string | null;
  activity: Activity;
  days: Day[];
  time_start: string;
  time_end: string;
  experience_level: ExperienceLevel;
  /** Only used for ordering; deliberately never rendered. */
  score: number;
  shared_days: number;
  time_overlap_minutes: number;
  /** F3.4 — shares a day but no overlapping hours. */
  relaxed: boolean;
};

/** PRD F3.3 — "the top 3 are returned". */
export const MAX_MATCHES = 3;

/** PRD F3.4 — the label, verbatim. */
export const RELAXED_LABEL = "Close, but different hours";

/** PRD F3.6 — the empty-pool copy, verbatim. */
export const EMPTY_POOL_COPY =
  "You're early. Your intent is live — we'll surface people as they post.";
