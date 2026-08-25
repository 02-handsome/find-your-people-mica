import Link from "next/link";

import { WithdrawIntent } from "@/components/WithdrawIntent";
import { CARD, HINT } from "@/components/ui";
import {
  ACTIVITY_LABELS,
  DAYS,
  EXPERIENCE_LABELS,
  formatExpiry,
  formatTimeRange,
  type Intent,
} from "@/lib/intents";

/**
 * PRD F2.3 — the active intent on home, with a countdown.
 *
 * All seven days are rendered with the selected ones filled, rather than
 * listing only the chosen days. At 375px a fixed seven-chip row is easier to
 * read at a glance than a variable-length list, and it shows what was NOT
 * chosen — which is the thing you check before deciding to edit.
 */
export function IntentCard({ intent }: { intent: Intent }) {
  return (
    <section className={CARD}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {ACTIVITY_LABELS[intent.activity]}
          </h2>
          <p className={HINT}>{EXPERIENCE_LABELS[intent.experience_level]}</p>
        </div>
        <span className="shrink-0 rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
          {formatExpiry(intent.expires_at)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Days">
        {DAYS.map((day) => {
          const on = intent.days.includes(day);
          return (
            <span
              key={day}
              className={
                "rounded-full px-2.5 py-1 text-xs " +
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

      <p className="mt-3 text-sm">
        {formatTimeRange(intent.time_start, intent.time_end)}
      </p>

      {/* Both remaining CRUD operations, one tap each from home. */}
      <div className="mt-5 flex items-center gap-5">
        <Link
          href="/intent/edit"
          className="text-sm font-medium underline text-neutral-600 dark:text-neutral-400"
        >
          Edit
        </Link>
        <WithdrawIntent />
      </div>
    </section>
  );
}
