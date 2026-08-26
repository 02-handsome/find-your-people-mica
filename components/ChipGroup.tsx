"use client";

import { useState } from "react";

import { HINT } from "@/components/ui";

export type ChipOption = {
  value: string;
  label: string;
  /** Only rendered by the `grid` variant. */
  icon?: React.ReactNode;
};

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
 *
 * ## Variants
 *
 * `chip` (default) — a compact pill. What days, tags, years and levels use.
 * Seven day chips have to sit on one or two rows at 375px, so they stay dense.
 *
 * `grid` — a two-column grid of tall cards, icon above label. For the activity
 * choice, which is the single most consequential field on the form: it decides
 * which pool you are matched in and, unlike every other field, cannot be
 * changed afterwards (AD-15). It earns the space.
 *
 * Both variants share this one component on purpose. They differ only in how a
 * cell is drawn — the state handling, the hidden inputs, the limit logic and
 * the announced counter are identical, and forking would leave two copies of
 * the part that is actually difficult.
 */
export function ChipGroup({
  name,
  options,
  initial = [],
  single = false,
  max,
  counter,
  ariaLabel,
  variant = "chip",
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
  variant?: "chip" | "grid";
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

      <div
        className={
          variant === "grid"
            ? "grid grid-cols-2 gap-3"
            : "flex flex-wrap gap-2"
        }
        role="group"
        aria-label={ariaLabel}
      >
        {items.map(({ value, label, icon }) => {
          const on = selected.includes(value);
          // Unselected chips go disabled at the limit, so the rule is visible
          // rather than silently swallowing the next tap.
          const disabled = !single && !on && atLimit;

          if (variant === "grid") {
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggle(value)}
                aria-pressed={on}
                disabled={disabled}
                className={
                  // Selection by inversion — a solid fill with the icon and
                  // label reversed out. The same mechanic the contact reveal
                  // uses, so the app has one way of saying "this one".
                  "flex min-h-[88px] flex-col items-start justify-between gap-3 " +
                  "rounded-xl border p-3.5 text-left transition-colors " +
                  (on
                    ? "border-primary bg-primary text-primary-foreground"
                    : disabled
                      ? "border-border text-muted-foreground/60"
                      : "border-border bg-card hover:bg-muted")
                }
              >
                {/* currentColor, so it reverses out with the label. */}
                {icon}
                <span className="text-sm font-medium">{label}</span>
              </button>
            );
          }

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
                  ? "border-primary bg-primary text-primary-foreground"
                  : disabled
                    ? "border-border text-muted-foreground/60"
                    : "border-input hover:bg-muted")
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
