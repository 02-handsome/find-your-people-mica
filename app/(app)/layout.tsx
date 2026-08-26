import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/ThemeToggle";
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

  return (
    <div className="relative">
      {/* Pinned to the same max-w-sm / px-6 / py-10 grid every page uses, so
          it lands beside the page heading instead of floating over it. The
          wrapper is click-through; only the button itself is not. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex w-full max-w-sm justify-end px-6 pt-10">
          <ThemeToggle className="pointer-events-auto" />
        </div>
      </div>
      {children}
    </div>
  );
}
