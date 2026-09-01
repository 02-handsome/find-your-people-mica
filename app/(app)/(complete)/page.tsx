import type { Metadata } from "next";
import { Dumbbell, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { IncomingRequestCard } from "@/components/IncomingRequestCard";
import { IntentCard } from "@/components/IntentCard";
import { LogOutButton } from "@/components/LogOutButton";
import { BUTTON_PRIMARY_LINK, CARD, HINT, LINK_MUTED, READABLE } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { getActiveIntent } from "@/lib/intents-server";
import { getIncomingRequests } from "@/lib/requests-server";

export const metadata: Metadata = { title: "Home · Find Your People" };

/**
 * Screen 4 (Home).
 *
 * PRD section 7 lists three things here: the active intent card with countdown
 * and edit/withdraw, incoming requests, and a link to matches. The first two
 * are sections below; the third is now the bottom nav, which is a better home
 * for it than a button that only appeared once you already had an intent.
 *
 * Incoming requests come FIRST, as they do in the Stitch layout — they are the
 * only thing on this screen where someone else is waiting on you, and the only
 * one with an irreversible action attached.
 */
export default async function HomePage() {
  const [profile, intent, incoming] = await Promise.all([
    getProfile(),
    getActiveIntent(),
    getIncomingRequests(),
  ]);

  // Returns nothing rather than throwing, and that is deliberate.
  //
  // I tried throwing here first, on the reasoning that `return null` renders an
  // empty <main> — a blank screen. It was wrong, and the dev log said so
  // immediately: the error fired on every anonymous request. Next renders
  // layouts and pages IN PARALLEL, so this component starts before
  // (app)/layout's redirect resolves, and `profile` is legitimately null for a
  // caller with no session.
  //
  // Nothing is rendered to anyone in that window — the redirect discards this
  // output — so the blank-screen worry did not apply. What DID matter is now
  // handled one level down: getProfile() throws on a query FAILURE, so null
  // here only ever means "no session" or "no row", and a guard redirects for
  // both. See lib/auth.ts.
  if (!profile) return null;

  // The same row the ranking uses. Derived from the intent this page already
  // loads for the card below — the reason line costs no extra query.
  const viewer = intent
    ? {
        days: intent.days,
        time_start: intent.time_start,
        time_end: intent.time_end,
      }
    : null;

  return (
    <main className={`${READABLE} flex flex-col gap-8 py-6`}>
      {/* F4.3 — incoming requests. Only rendered when there are any: an empty
          "no requests" panel on every visit would be noise, and this screen
          already has a designed empty state for the thing that matters when
          you are new (no intent). */}
      {incoming.failed ? (
        /* An inline failure, not a thrown one: the rest of this screen — the
           user's intent, their contact handle — loaded fine and is still
           useful. Degrading one section beats replacing the whole page. */
        <section className={`${CARD} text-center`}>
          <TriangleAlert
            aria-hidden
            className="mx-auto size-7 text-muted-foreground"
            strokeWidth={1.5}
          />
          <h2 className="mt-4 text-base font-semibold">
            Couldn&rsquo;t load your requests
          </h2>
          <p className={`mt-2 ${HINT}`}>
            If someone has asked to connect, it&rsquo;s still waiting — reload
            to try again.
          </p>
        </section>
      ) : incoming.requests.length > 0 ? (
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-[22px] leading-7 font-semibold tracking-tight">
              Requests
            </h2>
            <span className="label-caps rounded-full bg-primary px-2.5 py-1 text-primary-foreground">
              {incoming.requests.length} New
            </span>
          </div>
          <ul className="space-y-4">
            {incoming.requests.map((request) => (
              <IncomingRequestCard
                key={request.request_id}
                request={request}
                viewer={viewer}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-[22px] leading-7 font-semibold tracking-tight">
          Your Active Intent
        </h2>
        {intent ? (
          <IntentCard intent={intent} />
        ) : (
          /* CLAUDE.md: never a blank screen. This is the state a brand-new user
             lands on, so it explains the product in one line rather than just
             reporting an absence. */
          <div className={`${CARD} px-6 py-10 text-center`}>
            <Dumbbell
              aria-hidden
              className="mx-auto size-8 text-muted-foreground"
              strokeWidth={1.5}
            />
            <h3 className="mt-5 text-base font-semibold">No active intent</h3>
            <p className={`mt-2 ${HINT}`}>
              Post what you want a partner for, and you&rsquo;ll see a few
              people who posted the same thing.
            </p>
            <Link href="/intent/new" className={`mt-5 ${BUTTON_PRIMARY_LINK}`}>
              Post an intent
            </Link>
          </div>
        )}
      </section>

      <section className={CARD}>
        <h2 className="label-caps text-label">Your contact handle</h2>
        <p className="mt-2 font-mono text-base">{profile.contact_handle}</p>
        <p className={`mt-2 ${HINT}`}>
          {/* Stating the core product promise on the one screen where the user
              can see their own handle. PRD N4. */}
          Only shared with someone after you both accept a request.
        </p>
      </section>

      {/* Connections moved into the bottom nav; these two have nowhere else to
          live, so they stay as a quiet row. */}
      <div className="flex flex-wrap items-center gap-x-5">
        <Link href="/profile-setup" className={LINK_MUTED}>
          Edit profile
        </Link>
        <LogOutButton />
      </div>
    </main>
  );
}
