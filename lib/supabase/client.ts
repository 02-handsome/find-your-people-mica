import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Supabase client for Client Components (anything with "use client").
 *
 * Reads and writes the session as browser cookies, so the server client in
 * ./server.ts can read the same session. That shared-cookie arrangement is the
 * whole reason we use @supabase/ssr rather than plain supabase-js.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
