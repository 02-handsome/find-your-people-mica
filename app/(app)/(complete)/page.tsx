import type { Metadata } from "next";
import Link from "next/link";

import { signOutAction } from "@/app/(app)/actions";
import { Avatar } from "@/components/Avatar";
import { IncomingRequestCard } from "@/components/IncomingRequestCard";
import { IntentCard } from "@/components/IntentCard";
import { BUTTON_PRIMARY_LINK, CARD, HINT } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { getActiveIntent } from "@/lib/intents-server";
import { getIncomingRequests } from "@/lib/requests-server";

export const metadata: Metadata = { title: "Home · Find Your People" };

/**
 * Screen 4 (Home) — Phase 6 version.
 *
 * PRD section 7 lists three things here: the active intent card with countdown
 * and edit/withdraw, incoming requests, and a link to matches. All three are
 * present, plus a link to Connections (screen 6).
 *
 * Incoming requests come FIRST, above the user's own intent. They are the only
 * thing on this screen where someone else is waiting on you, and the only one
 * with an irreversible action attached.
 */
export default async function HomePage() {
  // (complete)/layout.tsx has already guaranteed a complete profile.
  const [profile, intent, incoming] = await Promise.all([
    getProfile(),
    getActiveIntent(),
    getIncomingRequests(),
  ]);
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

      {/* F4.3 — incoming requests. Only rendered when there are any: an empty
          "no requests" panel on every visit would be noise, and this screen
          already has a designed empty state for the thing that matters when
          you are new (no intent). */}
      {incoming.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-medium">
            {incoming.length === 1
              ? "1 person wants to connect"
              : `${incoming.length} people want to connect`}
          </h2>
          <ul className="mt-3 space-y-4">
            {incoming.map((request) => (
              <IncomingRequestCard key={request.request_id} request={request} />
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-8">
        {intent ? (
          <>
            <IntentCard intent={intent} />
            {/* Screen 4 lists a link to matches. Only shown with a live intent,
                because matching is relative to one — there is nothing to
                compare against otherwise. */}
            <Link href="/matches" className={`mt-4 ${BUTTON_PRIMARY_LINK}`}>
              See your matches
            </Link>
          </>
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

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link
          href="/connections"
          className="text-sm font-medium underline text-neutral-600 dark:text-neutral-400"
        >
          Connections
        </Link>
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
