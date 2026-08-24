import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Refreshes the Supabase auth cookie. That is its only job.
 *
 * Server Components cannot write cookies, so an expiring access token has to be
 * refreshed somewhere that can write to the response — which is here. There is
 * deliberately no authorization logic: see docs/notes.md AD-1 and the comment
 * in middleware.ts.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Write to the request first so anything downstream in this same pass
        // sees the refreshed cookie, then rebuild the response carrying it.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // This call is the point of the whole file. Per the SDK docs, if the access
  // token is close to expiry getClaims() refreshes the session before
  // validating — which fires setAll() above and persists the new cookie.
  await supabase.auth.getClaims();

  return supabaseResponse;
}
