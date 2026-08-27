import type { Metadata } from "next";
import { TriangleAlert, Users } from "lucide-react";
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
    <main className="flex flex-col gap-6 py-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] leading-7 font-semibold tracking-tight">
            Your Top Matches
          </h1>
          <p className={`mt-1.5 ${HINT}`}>
            People who posted {ACTIVITY_LABELS[intent.activity]} and could make{" "}
            {formatTimeRange(intent.time_start, intent.time_end)}.
          </p>
        </div>

        {/* Stitch's pill reads "3 Nearby". There is no location data anywhere
            in this app, so the pill says the one thing that is true: how many
            F3.3 returned. */}
        {!failed && matches.length > 0 ? (
          <span className="shrink-0 rounded-full bg-track px-3 py-1 text-sm text-muted-foreground">
            {matches.length === 1 ? "1 match" : `${matches.length} matches`}
          </span>
        ) : null}
      </header>

      {failed ? (
        /* Distinct from the empty state on purpose. F3.6's "You're early" is a
           claim about the world; showing it after a failed query would be a
           confident lie about why the screen is empty. */
        <section className={`${CARD} text-center`}>
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
        <section className={`${CARD} px-6 py-10 text-center`}>
          <Users
            aria-hidden
            className="mx-auto size-8 text-muted-foreground"
            strokeWidth={1.5}
          />
          <h2 className="mt-5 text-base font-medium">Nobody yet</h2>
          <p className={`mt-2 ${HINT}`}>{EMPTY_POOL_COPY}</p>
        </section>
      ) : (
        <ul className="space-y-4">
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

    </main>
  );
}
