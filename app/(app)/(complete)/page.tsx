import type { Metadata } from "next";
import Link from "next/link";

import { signOutAction } from "@/app/(app)/actions";
import { Avatar } from "@/components/Avatar";
import { CARD, HINT } from "@/components/ui";
import { getProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Home · Find Your People" };

/**
 * Screen 4 (Home) — Phase 2 version.
 *
 * Deliberately minimal. Phase 2's bar is "can create an account and log back
 * in", so this shows enough to prove the session and the saved profile are
 * real. The active-intent card, incoming requests and the link to matches are
 * Phase 4 work (PRD section 7, screen 4) and are not stubbed out here.
 */
export default async function HomePage() {
  // (complete)/layout.tsx has already guaranteed this is non-null and complete.
  const profile = await getProfile();
  if (!profile) return null;

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-10">
      <header className="flex items-center gap-3">
        <Avatar src={profile.avatar_url} />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {profile.name}
          </h1>
          <p className={HINT}>{profile.year}</p>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {profile.tags?.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-neutral-200 px-3 py-1 text-sm dark:border-neutral-800"
          >
            {tag}
          </span>
        ))}
      </div>

      <section className={`mt-6 ${CARD}`}>
        <h2 className="text-sm font-medium">Your contact handle</h2>
        <p className="mt-1 font-mono text-sm">{profile.contact_handle}</p>
        <p className={`mt-2 ${HINT}`}>
          {/* Stating the core product promise on the one screen where the user
              can see their own handle. PRD N4. */}
          Only shared with someone after you both accept a request.
        </p>
      </section>

      {/* Editing has to be reachable, not just permitted. A wrong
          contact_handle would otherwise be revealed to every accepted match
          forever, and neither side could tell why the number does not work.
          See docs/notes.md AD-11. */}
      <div className="mt-8 flex items-center gap-5">
        <Link
          href="/profile-setup"
          className="text-sm font-medium underline text-neutral-600 dark:text-neutral-400"
        >
          Edit profile
        </Link>

        <form action={signOutAction}>
          <button
            type="submit"
            className="text-sm font-medium underline text-neutral-600 dark:text-neutral-400"
          >
            Log out
          </button>
        </form>
      </div>
    </main>
  );
}
