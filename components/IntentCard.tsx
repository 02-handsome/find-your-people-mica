import { Clock } from "lucide-react";
import Link from "next/link";

import { ActivityIcon } from "@/components/ActivityIcon";
import { DayCircles } from "@/components/DayCircles";
import { WithdrawIntent } from "@/components/WithdrawIntent";
import { BUTTON_NEUTRAL, BUTTON_PRIMARY_LINK, CARD, CHIP } from "@/components/ui";
import {
  ACTIVITY_LABELS,
  EXPERIENCE_LABELS,
  formatExpiry,
  formatTimeRange,
  type Intent,
} from "@/lib/intents";

/**
 * PRD F2.3 — the active intent on home, with a countdown.
 *
 * Follows the Stitch card: an icon and an uppercase category in primary, the
 * substance of the post underneath, chips, then the two actions side by side.
 *
 * Where Stitch has a free-text line ("Looking for study buddies for CS101"),
 * this app has no description field — `intents` holds an activity enum, days,
 * a window and a level, and adding a column is a schema change. So the slot
 * that carries the substance of the post is the TIME WINDOW, which is the
 * thing you would actually check before deciding to edit.
 *
 * All seven days are rendered with the selected ones filled, rather than
 * listing only the chosen days. At 375px a fixed seven-chip row is easier to
 * read at a glance than a variable-length list, and it shows what was NOT
 * chosen — which is the other thing you check before editing.
 */
export function IntentCard({ intent }: { intent: Intent }) {
  return (
    <section className={CARD}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-primary">
            <ActivityIcon activity={intent.activity} />
            <span className="label-caps">
              {ACTIVITY_LABELS[intent.activity]}
            </span>
          </div>
          <p className="mt-1.5 text-lg font-semibold tracking-tight">
            {formatTimeRange(intent.time_start, intent.time_end)}
          </p>
        </div>

        <span className="flex shrink-0 items-center gap-1 rounded-md bg-notice px-2 py-1 text-notice-foreground">
          <Clock aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
          <span className="label-caps text-[10px]">
            {formatExpiry(intent.expires_at)}
          </span>
        </span>
      </div>

      {/* Same circles as the match card, so days read one way across the app.
          Here a filled circle is a day you posted, not a day you share — the
          label is what carries that difference. */}
      <div className="mt-4">
        <DayCircles
          selected={intent.days}
          label="Days you posted"
          onLabel="posted"
          offLabel="not posted"
        />
      </div>

      <div className="mt-3">
        <span className={CHIP}>
          {EXPERIENCE_LABELS[intent.experience_level]}
        </span>
      </div>

      {/* Both remaining CRUD operations, one tap each from home, side by side
          and equally weighted the way Stitch pairs them. */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link href="/intent/edit" className={`${BUTTON_PRIMARY_LINK} flex-1`}>
          Edit Intent
        </Link>
        <WithdrawIntent className={`${BUTTON_NEUTRAL} flex-1`} />
      </div>
    </section>
  );
}
