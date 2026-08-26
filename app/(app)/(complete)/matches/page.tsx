import type { Metadata } from "next";
import { TriangleAlert, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MatchCard } from "@/components/MatchCard";
import { CARD, HINT } from "@/components/ui";
import { ACTIVITY_LABELS, formatTimeRange } from "@/lib/intents";
import { getActiveIntent } from "@/lib/intents-server";
import { EMPTY_POOL_COPY } from "@/lib/matches";
import { getMatches } from "@/lib/matches-server";

export const metadata: Metadata = { title: "Matches · Find Your People" };

/** Screen 5 (PRD section 7) — up to three ranked candidates. */
export default async function MatchesPage() {
  const intent = await getActiveIntent();

  // Matching is relative to your own intent, so there is nothing to show
  // without one. Home already owns the designed "Post an intent" state — one
  // canonical place to fix rather than two that can drift.
  if (!intent) redirect("/");

  const { matches, failed } = await getMatches();

  // The same row the ranking used. Passing it down is what lets each card say
  // WHY it is where it is; no extra query is involved.
  const viewer = {
    days: intent.days,
    time_start: intent.time_start,
    time_end: intent.time_end,
  };

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Your matches</h1>
        <p className={`mt-2 ${HINT}`}>
          People who posted {ACTIVITY_LABELS[intent.activity]} and could make{" "}
          {formatTimeRange(intent.time_start, intent.time_end)}.
        </p>
      </header>

      {failed ? (
        /* Distinct from the empty state on purpose. F3.6's "You're early" is a
           claim about the world; showing it after a failed query would be a
           confident lie about why the screen is empty. */
        <section className={`mt-8 ${CARD} text-center`}>
          <TriangleAlert
            aria-hidden
            className="mx-auto size-7 text-muted-foreground"
            strokeWidth={1.5}
          />
          <h2 className="mt-4 text-base font-medium">
            Couldn&rsquo;t load matches
          </h2>
          <p className={`mt-2 ${HINT}`}>
            Something went wrong on our side, not yours. Your intent is still
            live.
          </p>
        </section>
      ) : matches.length === 0 ? (
        /* F3.6, verbatim. CLAUDE.md: never a blank screen. */
        <section className={`mt-8 ${CARD} px-6 py-10 text-center`}>
          <Users
            aria-hidden
            className="mx-auto size-8 text-muted-foreground"
            strokeWidth={1.5}
          />
          <h2 className="mt-5 text-base font-medium">Nobody yet</h2>
          <p className={`mt-2 ${HINT}`}>{EMPTY_POOL_COPY}</p>
        </section>
      ) : (
        <ul className="mt-8 space-y-4">
          {matches.map((candidate, index) => (
            <MatchCard
              key={candidate.intent_id}
              candidate={candidate}
              viewer={viewer}
              // F3.3 hands these back already sorted, so the first row is the
              // top-ranked one.
              highlight={index === 0}
            />
          ))}
        </ul>
      )}

      <div className="mt-8">
        <Link
          href="/"
          className="inline-block py-3 text-sm font-medium underline text-muted-foreground"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
