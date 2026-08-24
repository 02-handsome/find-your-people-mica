import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * ============================================================================
 *  TOKEN REFRESH ONLY. DO NOT ADD AUTHORIZATION HERE.
 * ============================================================================
 *
 * It is tempting to put the "signed out? redirect to /login" check in this
 * file — most Supabase tutorials do. This project deliberately does not.
 * See docs/notes.md AD-1 for the full reasoning. In short:
 *
 *   - Middleware sits in front of the app, so it is a layer that can be
 *     skipped from outside. CVE-2025-29927 did exactly that by spoofing an
 *     internal header, bypassing middleware and every auth check inside it.
 *   - Next.js warns that editing the `matcher` below, or moving a Server
 *     Function to another route, can silently remove coverage from a path.
 *
 * The authorization decision lives in app/(app)/layout.tsx, inside the render
 * path, where no header can skip it. Each Server Action re-checks
 * independently via requireUserId() in lib/auth.ts.
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Everything except static assets. Without a matcher this would also run for
  // /_next/static and public files, wasting an auth round-trip on every image.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
