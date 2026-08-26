import { Avatar } from "@/components/Avatar";
import { ConnectButton } from "@/components/ConnectButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { HINT } from "@/components/ui";
import {
  DAYS,
  EXPERIENCE_LABELS,
  describeSharedDays,
  formatTimeRange,
  overlapWindow,
  sharedDays,
  toHHMM,
  type Day,
} from "@/lib/intents";
import { RELAXED_LABEL, type MatchCandidate } from "@/lib/matches";

/** What the viewer posted. Enough to work out the overlap, and nothing more. */
export type ViewerWindow = {
  days: Day[];
  time_start: string;
  time_end: string;
};

/**
 * Screen 5 — one candidate: avatar, name, year, tags, days and time.
 *
 * `score` is still deliberately not rendered. The PRD does not ask for it, and
 * showing a number invites the reader to argue with the weighting rather than
 * with the person.
 *
 * What IS rendered now is the *reason* — the shared days and the shared hours.
 * Those are the two largest terms in F3's formula, so the line explains the
 * ordering in the ranking's own currency without exposing the arithmetic. It
 * costs no extra query: get_matches() already returns shared_days and
 * time_overlap_minutes, and the matches page already loads the viewer's intent
 * to build its header. See docs/notes.md AD-28.
 */
export function MatchCard({
  candidate,
  viewer,
  highlight = false,
}: {
  candidate: MatchCandidate;
  viewer: ViewerWindow;
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
      <Card
        className={
          // Ranking made visible without printing a score. A left rule rather
          // than a lighter surface: the card is already the lightest thing on
          // a cream page, so there is no lighter to go.
          highlight ? "border-l-4 border-l-primary" : undefined
        }
      >
        <CardContent>
          <div className="flex items-start gap-3">
            <Avatar src={candidate.avatar_url} name={candidate.name} size={44} />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold tracking-tight">
                {candidate.name}
              </h3>
              <p className={HINT}>
                {candidate.year} ·{" "}
                {EXPERIENCE_LABELS[candidate.experience_level]} ·{" "}
                {formatTimeRange(candidate.time_start, candidate.time_end)}
              </p>
            </div>
          </div>

          {/* The reason. Two overlapping circles rather than a clock or a
              calendar, because what it reports is the intersection itself. */}
          {shared.length > 0 ? (
            <div className="mt-3.5 flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5">
              <svg
                aria-hidden
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="mt-0.5 shrink-0 text-muted-foreground"
              >
                <circle cx="9" cy="12" r="6" />
                <circle cx="15" cy="12" r="6" />
              </svg>
              <p className="text-sm">
                You both train{" "}
                <span className="font-semibold">{describeSharedDays(shared)}</span>
                {overlap ? (
                  <>
                    , and you&rsquo;re both free{" "}
                    <span className="font-semibold">
                      {toHHMM(overlap.start)} – {toHHMM(overlap.end)}
                    </span>
                  </>
                ) : null}
                .
              </p>
            </div>
          ) : null}

          {/* All seven days. A filled chip now means a day you SHARE, not a day
              they happen to train — the intersection is the useful fact, and
              the line above names it in words, so the encoding needs no key. */}
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Days you share">
            {DAYS.map((day) => {
              const on = shared.includes(day);
              return (
                <span
                  key={day}
                  className={
                    "rounded-full px-2 py-0.5 text-xs " +
                    (on
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground/60")
                  }
                >
                  {day}
                </span>
              );
            })}
          </div>

          {candidate.tags && candidate.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {candidate.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}

          {/* F3.4 — shares a day, but the hours do not overlap. Neutral rather
              than the old amber: on a green palette a warm caution tint sitting
              beside a green primary reads as a traffic light. The copy is the
              PRD's, verbatim. */}
          {candidate.relaxed ? (
            <p className="mt-3 rounded-lg bg-secondary px-2.5 py-1.5 text-xs text-muted-foreground">
              {RELAXED_LABEL}
            </p>
          ) : null}

          {/* F4.1 — "From a match card, user sends a connection request." */}
          <ConnectButton toUserId={candidate.user_id} />
        </CardContent>
      </Card>
    </li>
  );
}
