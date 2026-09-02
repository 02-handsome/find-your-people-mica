import { Gauge } from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { ConnectButton } from "@/components/ConnectButton";
import { DayCircles } from "@/components/DayCircles";
import { TagRow } from "@/components/TagRow";
import { CARD, HINT } from "@/components/ui";
import {
  EXPERIENCE_LABELS,
  formatTimeRange,
  overlapWindow,
  sharedDays,
  toHHMM,
} from "@/lib/intents";
import { RELAXED_LABEL, type MatchCandidate } from "@/lib/matches";
import type { ViewerWindow } from "@/lib/overlap";

/**
 * Screen 5 — one candidate, following the Stitch match card.
 *
 * `score` is still deliberately not rendered. The PRD does not ask for it, and
 * showing a number invites the reader to argue with the weighting rather than
 * with the person.
 *
 * What IS rendered is the REASON, and Stitch's layout turns out to be a better
 * container for it than the sentence this card used to carry. Their card has a
 * labelled row — "Shared Study Days" on the left, the hours on the right — over
 * a row of day circles. That is exactly `shared_days` and
 * `time_overlap_minutes`, the two largest terms in F3's formula, which
 * get_matches() has returned since Phase 5 and which nothing rendered. The
 * label keeps the mutual phrasing the sentence had, because the point of
 * saying it at all is that neither of you asked first.
 *
 * Costs no query: the matches page already loads the viewer's own intent to
 * build its header, and the rest is arithmetic.
 *
 * The incoming-request card on home keeps the sentence form. That is not an
 * oversight — there you are reading one card and being told why someone found
 * you; here you are comparing three and want the shape of each at a glance.
 */
export function MatchCard({
  candidate,
  viewer,
  viewerTags,
  highlight = false,
}: {
  candidate: MatchCandidate;
  viewer: ViewerWindow;
  /**
   * The viewer's own profile tags. Separate from `viewer` on purpose: that is
   * the intent they posted, these are from `users`. See lib/overlap.ts.
   */
  viewerTags: string[] | null;
  /** F3.3 returns a ranked list; this marks the top one. */
  highlight?: boolean;
}) {
  const shared = sharedDays(viewer.days, candidate.days);
  const overlap = overlapWindow(
    viewer.time_start,
    viewer.time_end,
    candidate.time_start,
    candidate.time_end
  );

  return (
    <li>
      <article className={CARD}>
        <div className="flex items-start gap-4">
          {/* Stitch rings the top card's avatar in the accent. Ranking made
              visible without printing a position. */}
          <div
            className={
              "shrink-0 rounded-full " +
              (highlight
                ? "ring-2 ring-primary ring-offset-2 ring-offset-card"
                : "")
            }
          >
            <Avatar
              src={candidate.avatar_url}
              name={candidate.name}
              size={64}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[22px] leading-tight font-semibold tracking-tight">
              {candidate.name}
            </h3>
            <p className={`mt-1 ${HINT}`}>
              {candidate.year} · trains{" "}
              {formatTimeRange(candidate.time_start, candidate.time_end)}
            </p>
          </div>

          {/* Their PRO / INT slot. Every level gets the SAME neutral treatment:
              level ranks rather than filters (AD-19), and colouring one of the
              three differently would imply a hierarchy the app does not apply. */}
          <span className="flex shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-muted-foreground">
            <Gauge aria-hidden className="size-3.5" strokeWidth={2} />
            <span className="label-caps">
              {EXPERIENCE_LABELS[candidate.experience_level]}
            </span>
          </span>
        </div>

        {/* Shared interests are marked here rather than left as a flat list.
            This is the screen where it matters most: F3.1 and F3.2 already
            hard-filtered on activity and hours, so all three candidates share
            those — tags are the term that actually separates them. */}
        <TagRow className="mt-3" viewerTags={viewerTags} tags={candidate.tags} />

        <hr className="my-4 border-border" />

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-label">You both train</span>
          <span className="label-caps text-primary">
            {overlap
              ? `${toHHMM(overlap.start)} – ${toHHMM(overlap.end)}`
              : "No shared hours"}
          </span>
        </div>

        <div className="mt-3">
          <DayCircles
            selected={shared}
            label="Days you both train"
            onLabel="shared"
            offLabel="not shared"
          />
        </div>

        {/* F3.4 — shares a day, but the hours do not overlap. Neutral rather
            than a warning tint: on a red palette a caution colour beside the
            red primary reads as a traffic light. The copy is the PRD's,
            verbatim. */}
        {candidate.relaxed ? (
          <p className="mt-4 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
            {RELAXED_LABEL}
          </p>
        ) : null}

        {/* F4.1 — "From a match card, user sends a connection request." */}
        <ConnectButton toUserId={candidate.user_id} />
      </article>
    </li>
  );
}
