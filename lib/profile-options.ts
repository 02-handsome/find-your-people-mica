/**
 * The fixed lists behind screen 2 (profile setup), plus profile completeness.
 *
 * Both lists are one-line edits. Tag membership is validated in the Server
 * Action; the database enforces only the content-independent rule (exactly 3),
 * for the reason noted in supabase/migrations/0001_users.sql.
 */

export const YEARS = ["PGP 1", "PGP 2", "PhD", "Faculty"] as const;

export const TAGS = [
  "Cricket",
  "Football",
  "Badminton",
  "Tennis",
  "Running",
  "Gym",
  "Swimming",
  "Yoga",
  "Cycling",
  "Basketball",
  "Table Tennis",
  "Trekking",
  "Music",
  "Photography",
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
