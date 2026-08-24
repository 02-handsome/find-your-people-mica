import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Must be created per-request, never cached in a module-level variable: it is
 * bound to one request's cookies, and sharing it across requests would leak one
 * user's session into another's.
 */
export async function createClient() {
  // Async since Next.js 15 — `cookies()` returns a promise.
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies, so this throws when called
          // from one. Safe to swallow: refreshing the token cookie is
          // middleware's job (Phase 2). See docs/notes.md, AD-1.
        }
      },
    },
  });
}
