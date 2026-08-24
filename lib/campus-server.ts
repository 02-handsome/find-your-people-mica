import { createClient } from "@/lib/supabase/server";

/**
 * Reads the campus domain allowlist from its single source of truth: the
 * `public.allowed_email_domains()` function in Postgres.
 *
 * Kept in a separate module from lib/campus.ts so that file stays free of
 * server-only imports (next/headers) and can be used by Client Components.
 *
 * The login and signup notices render from this, so adding a domain to the SQL
 * function updates the user-facing copy with no code change.
 */
export async function getAllowedEmailDomains(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("allowed_email_domains");

  // A failure here must not break the page — the notice is informational, and
  // the database trigger is what actually enforces F1.2.
  if (error || !Array.isArray(data)) return [];

  return data as string[];
}
