"use client";

import { useState } from "react";

import { HINT } from "@/components/ui";
import { TAGS, TAGS_REQUIRED } from "@/lib/profile-options";

/** PRD 4.1 — exactly 3 tags, from a fixed list. */
export function TagPicker({ initial = [] }: { initial?: string[] }) {
  const [selected, setSelected] = useState<string[]>(initial);
  const atLimit = selected.length >= TAGS_REQUIRED;

  function toggle(tag: string) {
    setSelected((current) => {
      if (current.includes(tag)) return current.filter((t) => t !== tag);
      if (current.length >= TAGS_REQUIRED) return current;
      return [...current, tag];
    });
  }

  return (
    <div>
      {/* The submitted value. Hidden inputs rather than a <select multiple>:
          the native multi-select is genuinely bad on mobile, and this posts as
          a simple repeated field that formData.getAll("tags") reads. */}
      {selected.map((tag) => (
        <input key={tag} type="hidden" name="tags" value={tag} />
      ))}

      <div className="flex flex-wrap gap-2">
        {TAGS.map((tag) => {
          const on = selected.includes(tag);

          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              aria-pressed={on}
              // Unselected chips go disabled at the limit, so the rule is
              // visible rather than silently swallowing the fourth tap.
              disabled={!on && atLimit}
              className={
                "rounded-full border px-3 py-1.5 text-sm transition-colors " +
                (on
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                  : atLimit
                    ? "border-neutral-200 text-neutral-400 dark:border-neutral-800 dark:text-neutral-600"
                    : "border-neutral-300 dark:border-neutral-700")
              }
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* aria-live so the count is announced as chips are toggled. */}
      <p className={`mt-2 ${HINT}`} aria-live="polite">
        {selected.length} of {TAGS_REQUIRED} chosen
      </p>
    </div>
  );
}
