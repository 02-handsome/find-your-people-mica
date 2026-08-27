import { DAYS, type Day } from "@/lib/intents";

/**
 * The seven-day row from the Stitch match card: single-letter circles, filled
 * for the days that count and muted for the rest.
 *
 * Shared by the match card (where filled means "a day you SHARE") and the
 * intent card (where it means "a day you posted"), so days are drawn one way
 * across the app. The `label` prop is what disambiguates the two readings for
 * anyone not looking at the surrounding copy.
 *
 * A single letter is ambiguous twice over — T is Tuesday or Thursday, S is
 * Saturday or Sunday — which is fine visually in a fixed Mon-first row and not
 * fine for a screen reader. Each circle therefore carries the full day name
 * and its state as sr-only text, and the letter itself is aria-hidden.
 */
const FULL: Record<Day, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

export function DayCircles({
  selected,
  label,
  onLabel = "selected",
  offLabel = "not selected",
}: {
  selected: readonly Day[];
  /** Names the row for assistive tech, e.g. "Days you share". */
  label: string;
  onLabel?: string;
  offLabel?: string;
}) {
  return (
    <ul className="flex w-full justify-between" aria-label={label}>
      {DAYS.map((day) => {
        const on = selected.includes(day);
        return (
          <li
            key={day}
            className={
              "grid size-8 place-items-center rounded-full " +
              (on
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground")
            }
          >
            <span aria-hidden className="label-caps text-[10px]">
              {day.charAt(0)}
            </span>
            <span className="sr-only">
              {FULL[day]}, {on ? onLabel : offLabel}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
