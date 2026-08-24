/**
 * Campus identity — display copy only.
 *
 * The list of permitted email domains is NOT here. It lives in one place:
 * the `public.allowed_email_domains()` function in
 * supabase/migrations/0001_users.sql.
 *
 * Why: the publishable key is public by design, so anyone can call
 * POST /auth/v1/signup directly and bypass our Server Action. Only the
 * database can actually enforce F1.2. Keeping the list in TypeScript as well
 * would mean two places to edit and a chance for them to disagree.
 * See docs/notes.md, AD-5.
 */

export const CAMPUS_NAME = "MICA";

/** PRD F1.2 — the exact rejection copy, verbatim from the spec. */
export const CAMPUS_ONLY_MESSAGE =
  `Find Your People is currently only open to ${CAMPUS_NAME}. ` +
  `Use your college email to join.`;
