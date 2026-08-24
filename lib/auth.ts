import { cache } from "react";
import { redirect } from "next/navigation";

import type { Profile } from "@/lib/profile-options";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in user's id, or null.
 *
 * Uses getClaims(), not getSession(). The SDK is explicit that with cookie
 * storage the user object from getSession() "must not be trusted" — the cookie
 * is attacker-supplied data until the JWT signature has been verified.
 * getClaims() verifies it locally against the project's signing key, so this
 * costs no network round-trip.
 *
 * cache() dedupes within a single request: the nested layouts and the page all
 * ask, and without it each would repeat the work.
 */
export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
});

/** The signed-in user's own profile row, or null if signed out. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const userId = await getUserId();
  if (!userId) return null;

  const supabase = await createClient();

  // RLS restricts this to the caller's own row, so the contact_handle returned
  // here is the user's own. No cross-user read policy exists at all (PRD N4).
  const { data } = await supabase
    .from("users")
    .select("id, email, name, year, tags, avatar_url, contact_handle")
    .eq("id", userId)
    .maybeSingle();

  return data ?? null;
});

/**
 * Establish identity inside a Server Action.
 *
 * Every action calls this rather than trusting the layout guard, because
 * Next.js treats Server Functions as POSTs to whatever route they are used on:
 * a matcher edit or a refactor that moves an action can quietly drop it out of
 * middleware's coverage. Cheap to call — the JWT check is local.
 */
export async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  return userId;
}
