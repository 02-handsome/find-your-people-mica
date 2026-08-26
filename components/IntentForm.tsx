"use client";

import { useActionState } from "react";

import type { IntentFormState } from "@/app/(app)/(complete)/intent/actions";
import { Dumbbell, Footprints, Volleyball } from "lucide-react";

import { ChipGroup } from "@/components/ChipGroup";
import { FormError } from "@/components/FormError";
import { SubmitButton } from "@/components/SubmitButton";
import { HINT, INPUT, LABEL } from "@/components/ui";
import {
  ACTIVITIES,
  ACTIVITY_LABELS,
  DAYS,
  EXPERIENCE_LABELS,
  EXPERIENCE_LEVELS,
  toHHMM,
  type Activity,
  type Intent,
} from "@/lib/intents";

/**
 * The activity picker is the one field that cannot be changed after posting
 * (AD-15), so it gets the tall two-column treatment rather than a pill row —
 * a pattern borrowed from Strava's sport picker. Icons carry no information
 * the label does not; they are there to make three near-identical rectangles
 * distinguishable at a glance.
 */
const ACTIVITY_ICONS: Record<Activity, React.ReactNode> = {
  gym: <Dumbbell aria-hidden className="size-6" strokeWidth={1.75} />,
  running: <Footprints aria-hidden className="size-6" strokeWidth={1.75} />,
  sport: <Volleyball aria-hidden className="size-6" strokeWidth={1.75} />,
};

/**
 * Screen 3 (PRD section 7): activity, day toggles, time range, experience level.
 *
 * Serves create and edit. The difference is `activity`: F2.4 lists days, time
 * window and experience level as editable and NOT activity, so in edit mode it
 * is shown as fixed text with a hidden input carrying the existing value.
 * Changing activity would move the user into a different match pool (it is
 * F3.1's hard filter) while any requests they had sent dangled.
 */
export function IntentForm({
  action,
  intent,
  mode,
}: {
  action: (
    state: IntentFormState,
    formData: FormData
  ) => Promise<IntentFormState>;
  intent?: Intent | null;
  mode: "create" | "edit";
}) {
  const [state, formAction] = useActionState(action, { error: null });
  const submitted = state.values;

  const activity = submitted?.activity ?? intent?.activity ?? "";
  const days = submitted?.days ?? intent?.days ?? [];
  const level = submitted?.level ?? intent?.experience_level ?? "";
  const timeStart =
    submitted?.timeStart ?? (intent ? toHHMM(intent.time_start) : "06:00");
  const timeEnd =
    submitted?.timeEnd ?? (intent ? toHHMM(intent.time_end) : "08:00");

  return (
    <form action={formAction} className="mt-6 space-y-6">
      <FormError message={state.error} />

      <div>
        <span className={LABEL}>Activity</span>
        {mode === "create" ? (
          <ChipGroup
            name="activity"
            variant="grid"
            options={ACTIVITIES.map((a) => ({
              value: a,
              label: ACTIVITY_LABELS[a],
              icon: ACTIVITY_ICONS[a],
            }))}
            initial={activity ? [activity] : []}
            single
            ariaLabel="Activity"
          />
        ) : (
          <>
            <input type="hidden" name="activity" value={activity} />
            <p className="text-base">
              {ACTIVITY_LABELS[activity as keyof typeof ACTIVITY_LABELS]}
            </p>
            <p className={`mt-1.5 ${HINT}`}>
              Activity can&rsquo;t be changed — withdraw and post a new intent
              instead. It decides which pool you&rsquo;re matched in.
            </p>
          </>
        )}
      </div>

      <div>
        <span className={LABEL}>Which days?</span>
        <ChipGroup
          name="days"
          options={DAYS}
          initial={days}
          counter={(n) => (n === 0 ? "Pick at least one" : `${n} selected`)}
          ariaLabel="Days"
        />
      </div>

      <div>
        <span className={LABEL}>Time window</span>
        {/* Native time inputs on purpose — the OS picker beats anything custom
            at 375px, and it enforces a valid clock value for free. */}
        <div className="flex items-center gap-3">
          <input
            id="time_start"
            name="time_start"
            type="time"
            required
            defaultValue={timeStart}
            aria-label="Start time"
            className={INPUT}
          />
          <span className={HINT}>to</span>
          <input
            id="time_end"
            name="time_end"
            type="time"
            required
            defaultValue={timeEnd}
            aria-label="End time"
            className={INPUT}
          />
        </div>
        <p className={`mt-1.5 ${HINT}`}>
          The window you could actually make, not the exact hour.
        </p>
      </div>

      <div>
        <span className={LABEL}>How would you describe yourself?</span>
        {/* Same class of gap as the tag picker (AD-9): experience level is a
            SCORING term, not a filter. F3 gives it `match ? 2 : 0`, so a
            "Serious" runner is still matched with beginners — just two points
            lower, which one extra shared day already outweighs. Without this
            line, choosing "Serious" reads as "don't pair me with beginners",
            which is a request the app never agreed to. */}
        <p className={`mb-3 ${HINT}`}>
          You&rsquo;ll still match with every level — this just nudges similar
          ones higher.
        </p>
        <ChipGroup
          name="experience_level"
          options={EXPERIENCE_LEVELS.map((l) => ({
            value: l,
            label: EXPERIENCE_LABELS[l],
          }))}
          initial={level ? [level] : []}
          single
          ariaLabel="Experience level"
        />
      </div>

      <SubmitButton pendingLabel="Saving…">
        {mode === "create" ? "Post intent" : "Save changes"}
      </SubmitButton>
    </form>
  );
}
