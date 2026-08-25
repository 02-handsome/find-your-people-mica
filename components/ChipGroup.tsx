"use client";

import { useState } from "react";

import { HINT } from "@/components/ui";

export type ChipOption = { value: string; label: string };

/**
 * Tap-to-select chips, single or multi.
 *
 * Replaces what would otherwise be five near-identical pickers (year, tags,
 * activity, days, experience level).
 *
 * Two properties are load-bearing and easy to lose in a rewrite:
 *
 *  1. **Selection lives in React state, not the DOM.** React 19 resets
 *     uncontrolled form fields once a form action completes, so a server-side
 *     validation failure on any ONE field would otherwise blank the others.
 *     A <select> is worse still: it is restored from its options' `selected`
 *     attribute, which `defaultValue` never sets. Holding state survives both.
 *     See docs/notes.md AD-11.
 *
 *  2. **The value is submitted through hidden inputs**, so the form posts a
 *     plain repeated field that formData.getAll(name) reads, and works without
 *     any client-side submit handler.
 */
export function ChipGroup({
  name,
  options,
  initial = [],
  single = false,
  max,
  counter,
  ariaLabel,
}: {
  name: string;
  options: readonly (string | ChipOption)[];
  initial?: string[];
  /** Exactly one, and never back to none once chosen. */
  single?: boolean;
  /** Multi only: refuse selections beyond this many. */
  max?: number;
  /** Multi only: e.g. n => `${n} of 3 chosen`. */
  counter?: (count: number) => string;
  ariaLabel?: string;
}) {
  const items: ChipOption[] = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  );

  const [selected, setSelected] = useState<string[]>(initial);

  const limit = single ? 1 : max;
  const atLimit = limit !== undefined && selected.length >= limit;

  function toggle(value: string) {
    setSelected((current) => {
      // Single-select replaces rather than toggles: tapping the chosen chip
      // again should not leave the field empty.
      if (single) return [value];
      if (current.includes(value)) return current.filter((v) => v !== value);
      if (limit !== undefined && current.length >= limit) return current;
      return [...current, value];
    });
  }

  return (
    <div>
      {single ? (
        // Always rendered, empty when nothing is chosen, so the server sees ""
        // and returns its own message rather than the field vanishing silently.
        <input type="hidden" name={name} value={selected[0] ?? ""} />
      ) : (
        selected.map((value) => (
          <input key={value} type="hidden" name={name} value={value} />
        ))
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
        {items.map(({ value, label }) => {
          const on = selected.includes(value);
          // Unselected chips go disabled at the limit, so the rule is visible
          // rather than silently swallowing the next tap.
          const disabled = !single && !on && atLimit;

          return (
            <button
              key={value}
              type="button"
              onClick={() => toggle(value)}
              aria-pressed={on}
              disabled={disabled}
              className={
                "rounded-full border px-3 py-1.5 text-sm transition-colors " +
                (on
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                  : disabled
                    ? "border-neutral-200 text-neutral-400 dark:border-neutral-800 dark:text-neutral-600"
                    : "border-neutral-300 dark:border-neutral-700")
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {counter ? (
        // aria-live so the count is announced as chips are toggled.
        <p className={`mt-2 ${HINT}`} aria-live="polite">
          {counter(selected.length)}
        </p>
      ) : null}
    </div>
  );
}
