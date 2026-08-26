/**
 * Colour theme: system by default, overridable, persisted.
 *
 * A COOKIE rather than localStorage, and that is the whole no-flash story.
 * localStorage cannot be read on the server, so the markup would have to ship
 * theme-less and be corrected by a blocking inline script before first paint —
 * the standard trick, but it puts a synchronous script in <head> and makes the
 * theme depend on JavaScript. A cookie is on the request, so the root layout
 * renders `data-theme` into the HTML itself. Nothing to correct, so nothing to
 * flash, and no script at all.
 *
 * The absence of the cookie is meaningful: it means "follow the OS", which is
 * the state every existing user is in and the one the CSS already handles
 * through prefers-color-scheme. So a user who never touches the toggle gets
 * byte-identical behaviour to before it existed.
 */

export const THEME_COOKIE = "fyp-theme";

/** One year. Long enough that a choice feels permanent. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type Theme = "light" | "dark";

/**
 * Anything else — absent, stale, or hand-edited by the user — is treated as
 * "no preference" and falls through to the media query. A cookie is client
 * input, so it is validated rather than trusted onto the html element.
 */
export function parseTheme(value: string | undefined): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}
