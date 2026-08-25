import { Avatar } from "@/components/Avatar";
import { ConnectButton } from "@/components/ConnectButton";
import { CARD, HINT } from "@/components/ui";
import { DAYS, EXPERIENCE_LABELS, formatTimeRange } from "@/lib/intents";
import { RELAXED_LABEL, type MatchCandidate } from "@/lib/matches";

/**
 * Screen 5 — one candidate: avatar, name, year, tags, days and time.
 *
 * `score` is deliberately not rendered. The PRD does not ask for it, and
 * showing a number invites the reader to argue with the weighting rather than
 * with the person.
 */
export function MatchCard({ candidate }: { candidate: MatchCandidate }) {
  return (
    <li className={CARD}>
      <div className="flex items-start gap-3">
        <Avatar src={candidate.avatar_url} size={44} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold tracking-tight">
            {candidate.name}
          </h3>
          <p className={HINT}>
            {candidate.year} · {EXPERIENCE_LABELS[candidate.experience_level]}
          </p>
        </div>
      </div>

      {candidate.tags && candidate.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {candidate.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs dark:border-neutral-800"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {/* All seven days, selected ones filled — same encoding as the user's own
          intent card, so the two read the same way and can be compared at a
          glance. */}
      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Days">
        {DAYS.map((day) => {
          const on = candidate.days.includes(day);
          return (
            <span
              key={day}
              className={
                "rounded-full px-2 py-0.5 text-xs " +
                (on
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "border border-neutral-200 text-neutral-400 dark:border-neutral-800 dark:text-neutral-600")
              }
            >
              {day}
            </span>
          );
        })}
      </div>

      <p className="mt-2.5 text-sm">
        {formatTimeRange(candidate.time_start, candidate.time_end)}
      </p>

      {/* F3.4 — shares a day, but the hours do not overlap. Labelled so the
          reader is not left wondering why a mismatched schedule is in the list. */}
      {candidate.relaxed ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          {RELAXED_LABEL}
        </p>
      ) : null}

      {/* F4.1 — "From a match card, user sends a connection request." */}
      <ConnectButton toUserId={candidate.user_id} />
    </li>
  );
}
