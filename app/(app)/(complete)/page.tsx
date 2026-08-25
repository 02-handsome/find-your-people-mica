import type { Metadata } from "next";
import Link from "next/link";

import { signOutAction } from "@/app/(app)/actions";
import { Avatar } from "@/components/Avatar";
import { IntentCard } from "@/components/IntentCard";
import { BUTTON_PRIMARY_LINK, CARD, HINT } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { getActiveIntent } from "@/lib/intents-server";

export const metadata: Metadata = { title: "Home · Find Your People" };

/**
 * Screen 4 (Home) — Phase 4 version.
 *
 * Carries the intent half of the screen: the active intent card with its
 * countdown and edit/withdraw (F2.3), or a designed empty state with the way to
 * create one. Incoming requests and the link to matches are Phases 5–6 and are
 * deliberately not stubbed here.
 *
 * F2's acceptance is that all four CRUD operations sit within two taps of this
 * screen: read is already on it, create is "Post an intent" then submit, update
 * is "Edit" then save, delete is "Withdraw" then confirm.
 */
export default async function HomePage() {
  // (complete)/layout.tsx has already guaranteed a complete profile.
  const [profile, intent] = await Promise.all([getProfile(), getActiveIntent()]);
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

      <div className="mt-8">
        {intent ? (
          <IntentCard intent={intent} />
        ) : (
          /* CLAUDE.md: never a blank screen. This is the state a brand-new user
             lands on, so it explains the product in one line rather than just
             reporting an absence. */
          <section className={CARD}>
            <h2 className="text-base font-medium">No active intent</h2>
            <p className={`mt-1 ${HINT}`}>
              Post what you want a partner for, and you&rsquo;ll see a few
              people who posted the same thing.
            </p>
            <Link href="/intent/new" className={`mt-4 ${BUTTON_PRIMARY_LINK}`}>
              Post an intent
            </Link>
          </section>
        )}
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
