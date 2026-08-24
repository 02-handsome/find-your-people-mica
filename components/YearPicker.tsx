"use client";

import { useState } from "react";

import { YEARS } from "@/lib/profile-options";

/**
 * Single-select year, as chips rather than a <select>.
 *
 * Two reasons, both practical:
 *
 *  1. **Mobile.** With four options, a native dropdown costs a tap to open, a
 *     scroll and a tap to confirm. Chips are one tap, and at 375px they fit on
 *     one or two rows.
 *  2. **It survives a failed submit.** React 19 resets uncontrolled fields once
 *     a form action completes, and a <select> is restored from its options'
 *     `selected` attribute — which `defaultValue` does not set. So a select
 *     silently snapped back to the placeholder every time server-side
 *     validation rejected any other field. Holding the choice in state, exactly
 *     as TagPicker does, removes that whole failure mode.
 */
export function YearPicker({ initial = "" }: { initial?: string }) {
  const [year, setYear] = useState(initial);

  return (
    <div>
      {/* The submitted value. Empty until chosen, which the server rejects with
          "Please choose your year." */}
      <input type="hidden" name="year" value={year} />

      <div className="flex flex-wrap gap-2">
        {YEARS.map((option) => {
          const on = option === year;

          return (
            <button
              key={option}
              type="button"
              onClick={() => setYear(option)}
              aria-pressed={on}
              className={
                "rounded-full border px-3 py-1.5 text-sm transition-colors " +
                (on
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                  : "border-neutral-300 dark:border-neutral-700")
              }
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
