/**
 * Shared class strings. Not a design system — just the three or four
 * repetitions that would otherwise drift apart between screens.
 *
 * Everything here now speaks in palette tokens (`bg-card`, `text-muted-
 * foreground`, `border-border`) rather than fixed neutrals, so the Astryx
 * matcha values in app/globals.css are the single place a colour is decided.
 */

// text-base (16px) is deliberate: iOS Safari zooms the viewport when a focused
// input has a font-size below 16px, which breaks the 375px-first layout.
export const INPUT =
  "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-base " +
  "outline-none transition-colors focus:border-primary";

export const LABEL = "block text-sm font-medium mb-1.5";

/**
 * Disabled state is a FADED ACCENT, not grey.
 *
 * The whole-element `disabled:opacity-50` this used to carry made the button
 * the same washed grey as any other inactive control. On a cream background
 * with a deep-green accent that loses the one thing the state should say —
 * *this* is the button that becomes available. Fading the fill and the label
 * separately keeps it recognisably the same button, switched off.
 */
export const BUTTON_PRIMARY =
  "h-auto w-full rounded-lg bg-primary px-4 py-3 text-base font-medium " +
  "text-primary-foreground transition-opacity hover:opacity-90 " +
  "disabled:bg-primary/40 disabled:text-primary-foreground/70 " +
  // shadcn's Button base carries disabled:opacity-50; left alone it would
  // grey the whole control and undo the faded-accent state above.
  "disabled:opacity-100";

/** Same as BUTTON_PRIMARY, for an <a>/<Link> rather than a <button>. */
export const BUTTON_PRIMARY_LINK = BUTTON_PRIMARY + " inline-block text-center";

/**
 * Neutral secondary action. Used for Decline and Withdraw.
 *
 * Deliberately NOT red. Matcha is a green palette, and green-plus-red across
 * a pair of adjacent buttons reads as a traffic light — which would make
 * declining look like an error rather than an ordinary, silent choice (F4.6).
 */
export const BUTTON_NEUTRAL =
  "h-auto rounded-lg border border-input bg-transparent px-5 py-3 " +
  "text-base font-medium text-foreground transition-colors hover:bg-muted";

/** A text link sized as a real target. 14px text in a 44px hit area. */
export const LINK_MUTED =
  "inline-block py-3 text-sm font-medium underline text-muted-foreground";

export const HINT = "text-sm text-muted-foreground";

export const CARD = "rounded-xl border border-border bg-card p-4";
