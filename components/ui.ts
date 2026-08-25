/**
 * Shared class strings. Not a design system — just the three or four
 * repetitions that would otherwise drift apart between screens.
 */

// text-base (16px) is deliberate: iOS Safari zooms the viewport when a focused
// input has a font-size below 16px, which breaks the 375px-first layout.
export const INPUT =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-base " +
  "outline-none transition-colors focus:border-neutral-900 " +
  "dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100";

export const LABEL = "block text-sm font-medium mb-1.5";

export const BUTTON_PRIMARY =
  "w-full rounded-lg bg-neutral-900 px-4 py-3 text-base font-medium text-white " +
  "transition-opacity hover:opacity-90 disabled:opacity-50 " +
  "dark:bg-neutral-100 dark:text-neutral-900";

/** Same as BUTTON_PRIMARY, for an <a>/<Link> rather than a <button>. */
export const BUTTON_PRIMARY_LINK = BUTTON_PRIMARY + " inline-block text-center";

export const HINT = "text-sm text-neutral-500";

export const CARD =
  "rounded-xl border border-neutral-200 p-4 dark:border-neutral-800";
