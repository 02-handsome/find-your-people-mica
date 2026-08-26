/**
 * Shared class strings. Not a design system — just the repetitions that would
 * otherwise drift apart between screens.
 *
 * Everything speaks in palette tokens, so the Stitch values in app/globals.css
 * are the single place a colour is decided. Sizes follow their component spec:
 * 48px inputs and buttons, 8px on standard elements, 12px on large containers,
 * pills for anything that is a tag rather than an action.
 */

/**
 * Stitch: "Text Fields: 48px minimum height. 1px gray border that turns Red on
 * focus." text-base (16px) is also what stops iOS Safari zooming the viewport
 * on focus, which would break the 375px-first layout.
 */
export const INPUT =
  "h-12 w-full rounded-lg border border-border bg-background px-4 text-base " +
  "text-foreground placeholder:text-muted-foreground outline-none " +
  "transition-colors focus:border-primary focus:ring-1 focus:ring-primary";

/** Stitch `label-caps` — uppercase monospace, defined in globals.css. */
export const LABEL = "label-caps block text-label mb-1.5";

/**
 * Stitch: "Primary: Vibrant Red background with white text", plus the one
 * functional shadow in the system and a 1px press.
 *
 * Disabled is a FADED ACCENT, not grey — it has to stay recognisably the same
 * button, switched off, rather than becoming an anonymous inactive control.
 * That mattered more under the old palette, where accent and body text were
 * the same hex; it is still the right behaviour here.
 */
export const BUTTON_PRIMARY =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg " +
  "bg-primary px-4 text-base font-semibold text-primary-foreground " +
  "shadow-(--shadow-primary) transition-all hover:opacity-90 " +
  "active:translate-y-px active:shadow-none " +
  "disabled:bg-primary/40 disabled:text-primary-foreground/70 " +
  // shadcn's Button base carries disabled:opacity-50; left alone it would grey
  // the whole control and undo the faded-accent state above.
  "disabled:opacity-100 disabled:shadow-none";

/** Same as BUTTON_PRIMARY, for an <a>/<Link> rather than a <button>. */
export const BUTTON_PRIMARY_LINK = BUTTON_PRIMARY;

/**
 * Stitch: "Secondary: White background with a 1px border and text." Used for
 * Decline and Withdraw.
 *
 * Deliberately NOT red. Their `error` red exists, but a red button beside the
 * red primary reads as a traffic light and would make an ordinary silent
 * decline (F4.6) look like a failure.
 */
export const BUTTON_NEUTRAL =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg border " +
  "border-border bg-card px-5 text-base font-semibold text-foreground " +
  "transition-colors hover:bg-muted active:translate-y-px " +
  "disabled:opacity-50";

/** Stitch `body-sm` in text-muted. */
export const HINT = "text-sm text-muted-foreground";

/**
 * Stitch: "Match Cards: pure white surface with a 1px border-subtle", 16px
 * radius on large containers, and the low-opacity card shadow.
 */
export const CARD =
  "rounded-xl border border-border bg-card p-5 shadow-(--shadow-card)";

/** Stitch: "Data Chips: tertiary light-gray background with text-muted." */
export const CHIP =
  "inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs " +
  "font-medium text-secondary-foreground";

/** A text link sized as a real target. 14px text in a 44px hit area. */
export const LINK_MUTED =
  "inline-block py-3 text-sm font-medium underline text-muted-foreground";
