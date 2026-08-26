"use client";

import { Moon, Sun } from "lucide-react";

import { THEME_COOKIE, THEME_COOKIE_MAX_AGE, type Theme } from "@/lib/theme";

/**
 * Light/dark toggle.
 *
 * Two details are doing more work than they look:
 *
 * 1. **Both icons are always rendered**, and the `dark:` variant picks which
 *    one is visible. The alternative — deciding in JS — cannot work here: on
 *    a first visit with no cookie the server does not know the OS preference,
 *    so a JS-chosen icon would be wrong until hydration. That would trade the
 *    flash of the wrong theme for a flash of the wrong icon. CSS knows the
 *    answer at first paint; JavaScript does not.
 *
 *    It also makes this button the canary for the whole variant: these are the
 *    only two `dark:` utilities left in the app's own code, so if the
 *    three-state variant ever breaks, the icon stops matching the page.
 *
 * 2. **The label does not name a direction.** "Switch to dark mode" would be
 *    wrong half the time for the same reason, and it cannot be swapped by CSS
 *    the way an icon can.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;

    // What is on screen right now: an explicit choice if one exists, otherwise
    // whatever the OS is currently saying.
    const explicit = root.dataset.theme;
    const current: Theme =
      explicit === "dark" || explicit === "light"
        ? explicit
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    const next: Theme = current === "dark" ? "light" : "dark";

    // Applied to the live document first so the change is instant, then
    // written to the cookie so the SERVER renders it on the next navigation.
    // Both matter: without the first the page would not change until reload,
    // without the second the reload would flash back.
    root.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch colour theme"
      title="Switch colour theme"
      className={
        "inline-flex size-11 shrink-0 items-center justify-center rounded-lg " +
        "border border-border bg-card text-muted-foreground transition-colors " +
        "hover:bg-muted hover:text-foreground " +
        className
      }
    >
      <Moon aria-hidden className="size-4 dark:hidden" strokeWidth={1.75} />
      <Sun aria-hidden className="hidden size-4 dark:block" strokeWidth={1.75} />
    </button>
  );
}
