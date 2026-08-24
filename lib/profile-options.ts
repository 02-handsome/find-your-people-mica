/**
 * The fixed lists behind screen 2 (profile setup), plus profile completeness.
 *
 * Both lists are one-line edits. Tag membership is validated in the Server
 * Action; the database enforces only the content-independent rule (exactly 3),
 * for the reason noted in supabase/migrations/0001_users.sql.
 */

export const YEARS = ["PGP 1", "PGP 2", "PhD", "Faculty"] as const;

/**
 * Two kinds of tag, deliberately mixed.
 *
 * F3's scoring formula is:
 *
 *   score = (shared_days × 3) + (experience_level match ? 2 : 0)
 *         + (overlapping_tags × 2) + (time_overlap_minutes / 30)
 *
 * `activity` is already a hard filter (F3.1) — every candidate in the pool
 * matched on it before scoring begins. So a vocabulary made only of activities
 * would make `overlapping_tags` largely re-measure a fact the filter has
 * already settled: two gym-goers would score +2 for both tagging "Gym", which
 * is not new information and inflates every score equally.
 *
 * The interest tags below are what make that term an independent signal. They
 * are what separates two equally available gym partners.
 */
export const TAGS = [
  // Activity-adjacent — still useful, since the intent's `activity` is one
  // choice while these show what else someone plays.
  "Gym",
  "Running",
  "Football",
  "Cricket",
  "Badminton",
  "Trekking",
  // Independent of any activity. These carry the real discriminating power.
  "Marketing",
  "Finance",
  "Consulting",
  "F1",
  "Anime",
  "Coffee",
  "Startups",
  "Films",
] as const;

/** PRD 4.1: "Exactly 3, from a fixed list." */
export const TAGS_REQUIRED = 3;

/** The profile row as stored in public.users. */
export type Profile = {
  id: string;
  email: string;
  name: string | null;
  year: string | null;
  tags: string[] | null;
  avatar_url: string | null;
  contact_handle: string | null;
};

/**
 * Derived, never stored. A boolean column would be a second source of truth
 * that can drift out of step with the fields it summarises.
 */
export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.name?.trim() &&
      profile.year?.trim() &&
      profile.tags?.length === TAGS_REQUIRED &&
      profile.contact_handle?.trim()
  );
}

export function isValidYear(value: string): boolean {
  return (YEARS as readonly string[]).includes(value);
}

export function areValidTags(values: string[]): boolean {
  if (values.length !== TAGS_REQUIRED) return false;
  if (new Set(values).size !== values.length) return false;
  return values.every((v) => (TAGS as readonly string[]).includes(v));
}

/**
 * Contact handle is a phone or WhatsApp number (PRD 4.1). Kept deliberately
 * permissive: rejecting a real number a student wants to be reached on is a
 * worse failure than storing an oddly formatted one.
 */
export function normalizeContactHandle(raw: string): string {
  return raw.replace(/[\s()-]/g, "").trim();
}

export function isValidContactHandle(raw: string): boolean {
  const value = normalizeContactHandle(raw);
  // 10-digit Indian mobile, optionally with +91 / 0 / 91 prefix.
  return /^(\+91|91|0)?[6-9]\d{9}$/.test(value);
}
