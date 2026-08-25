/**
 * Intent and request vocabulary (PRD 4.2, 4.3).
 *
 * These mirror the Postgres enum types created in
 * supabase/migrations/0002_intents_requests.sql. The database is the real
 * authority — it rejects any value not in its enum — so if these ever drift,
 * writes fail loudly rather than storing something invalid.
 *
 * Imported by both the app and scripts/seed.mjs (Node 24 strips types from .ts
 * natively), so the seed cannot invent an activity or day the UI doesn't know.
 */

export const ACTIVITIES = ["gym", "running", "sport"] as const;
export type Activity = (typeof ACTIVITIES)[number];

/** Order matters: the normalize_intent_days trigger sorts days this way. */
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Day = (typeof DAYS)[number];

export const EXPERIENCE_LEVELS = ["beginner", "regular", "serious"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const INTENT_STATUSES = ["active", "withdrawn", "expired"] as const;
export type IntentStatus = (typeof INTENT_STATUSES)[number];

export const REQUEST_STATUSES = ["pending", "accepted", "declined"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** PRD F2.1 — expires_at = created_at + 7 days. */
export const INTENT_TTL_DAYS = 7;

export type Intent = {
  id: string;
  user_id: string;
  activity: Activity;
  days: Day[];
  /** Postgres `time`, serialised as "HH:MM:SS". */
  time_start: string;
  time_end: string;
  experience_level: ExperienceLevel;
  status: IntentStatus;
  created_at: string;
  expires_at: string;
};
