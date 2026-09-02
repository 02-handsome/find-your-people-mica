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
 * The secondary action. Decline, Withdraw.
 *
 * A FILLED grey, not the outlined white their DESIGN.md prose describes
 * ("Secondary: White background with a 1px Red border and Red text") — every
 * one of their five screens actually draws it as a filled neutral, and the
 * screens are what was chosen. A red-bordered secondary would also put red on
 * both halves of the Accept/Decline pair.
 *
 * Deliberately NOT red for the same reason it was not red before: declining is
 * silent and ordinary (F4.6), and red beside the red primary reads as a
 * traffic light.
 */
export const BUTTON_NEUTRAL =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg " +
  "bg-secondary px-5 text-base font-semibold text-secondary-foreground " +
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

/**
 * The same chip for a tag the viewer ALSO picked. See lib/overlap.ts.
 *
 * THREE cues, not one. Colour carries it at a glance, but WCAG 1.4.1 is that
 * colour must never be the only visual difference — so the shared chip is also
 * a heavier weight and leads with a check mark. A red/grey pair is exactly the
 * distinction a red-blind reader loses, and this app's accent is red.
 *
 * A 10% accent wash rather than a solid fill: three solid accent pills would
 * out-shout the Connect button, which is the only thing on the card that
 * should read as an action.
 */
export const CHIP_SHARED =
  "inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 " +
  "text-xs font-semibold text-primary";

/** A text link sized as a real target. 14px text in a 44px hit area. */
export const LINK_MUTED =
  "inline-block py-3 text-sm font-medium underline text-muted-foreground";

/**
 * The app shell column, and the one place its width is decided.
 *
 * It was previously written out by hand in six places — (complete)/layout,
 * profile-setup, (auth)/layout, AppBar, BottomNav and StickyActions — every one
 * of them reading `mx-auto w-full max-w-md px-5`. The chrome has to stay
 * exactly as wide as the content beneath it or the app bar and the page come
 * apart, so six independent copies is the "two places that can disagree"
 * failure this project keeps meeting (AD-5, AD-10, AD-20). One constant now,
 * consumed everywhere.
 *
 * MOBILE IS UNCHANGED, deliberately. Below 768px this resolves to exactly the
 * class set those sites already had, so every measurement in AD-28, AD-29 and
 * AD-30 — all taken at 375px — still describes what ships. The scale-up lives
 * entirely in `md:` and `lg:`.
 */
export const SHELL =
  "mx-auto w-full max-w-md px-5 md:max-w-3xl md:px-8 lg:max-w-5xl xl:max-w-7xl";

/**
 * A readable cap for one column of prose or form fields inside SHELL.
 *
 * Lists want the whole shell and go multi-column inside it; a form does not.
 * A 1024px-wide stack of 48px inputs is harder to fill in than a 448px one,
 * and the intent form's seven day chips were sized for a narrow column.
 */
export const READABLE = "mx-auto w-full lg:max-w-2xl";
