import {
  describeSharedDays,
  overlapWindow,
  sharedDays,
  toHHMM,
} from "@/lib/intents";
import type { ViewerWindow } from "@/lib/overlap";

/**
 * "You both train Mon–Fri, and you're both free 06:00 – 09:00."
 *
 * The reason a candidate is where they are, in the ranking's own currency.
 * AD-19 objected to rendering the SCORE, not to giving the reason:
 * `shared_days` and `time_overlap_minutes` are the two largest terms in F3's
 * formula and have come back from get_matches() since Phase 5, and every
 * screen that shows a candidate already loads the viewer's own intent. So this
 * costs no query — it is arithmetic over data already on the page.
 *
 * Shared by the match card and the incoming-request card, which is why it is a
 * component rather than a third copy of the same JSX. Renders nothing when
 * there is no viewer intent or no shared day, so callers do not have to guard.
 */
export function OverlapLine({
  viewer,
  days,
  timeStart,
  timeEnd,
  className = "",
}: {
  viewer: ViewerWindow | null;
  days: import("@/lib/intents").Day[];
  timeStart: string;
  timeEnd: string;
  className?: string;
}) {
  if (!viewer) return null;

  const shared = sharedDays(viewer.days, days);
  if (shared.length === 0) return null;

  const overlap = overlapWindow(
    viewer.time_start,
    viewer.time_end,
    timeStart,
    timeEnd
  );

  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg bg-secondary px-3 py-2.5 ${className}`}
    >
      {/* Two overlapping circles rather than a clock or a calendar, because
          what it reports is the intersection itself. */}
      <svg
        aria-hidden
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className="mt-0.5 shrink-0 text-primary"
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
  );
}
