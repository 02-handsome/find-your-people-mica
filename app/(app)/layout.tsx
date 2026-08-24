import { redirect } from "next/navigation";

import { getUserId } from "@/lib/auth";

/**
 * PRD F1.6 — the authorization boundary for every signed-in route.
 *
 * This is the decision recorded in docs/notes.md AD-1: the check lives here, in
 * the render path, not in middleware.ts. Nothing an attacker can put in a
 * header skips a layout.
 *
 * Note what this layout does NOT check: whether the profile is complete. That
 * belongs to (complete)/layout.tsx, one level down, so that /profile-setup can
 * sit inside this guard without redirecting to itself forever.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  return <>{children}</>;
}
