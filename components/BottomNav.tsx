"use client";

import { Handshake, House, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The main navigation, drawn two ways from one definition.
 *
 * ONE DELIBERATE DEPARTURE from Stitch: they use a chat bubble for
 * Connections. This app has no messaging and never will — in-app chat is the
 * first item on the PRD's non-goals list, and the whole point of F4.5 is that
 * it hands you a phone number and gets out of the way. A speech bubble in the
 * navigation would promise a feature that does not exist, so Connections gets
 * a handshake, matching the icon already on that screen's empty state.
 *
 * WHY TWO PLACEMENTS. A fixed bottom tab bar is a phone idiom; on a 1280px
 * window it is three icons huddled at the bottom of an otherwise empty bar.
 * From `md:` the tabs move into the app bar instead. Both are rendered from
 * the same TABS array through the same NavTabs component, so the active-tab
 * rule exists once — a second copy of that rule is exactly the kind of
 * duplication the width constants in components/ui.ts were extracted to stop.
 *
 * Only one is ever in the accessibility tree: each is `display:none` at the
 * other's widths, which removes it from the tree rather than merely hiding it,
 * so there are never two "Main" landmarks.
 *
 * A Client Component, and the only reason is usePathname() for the active tab.
 * No boundary moved: it is a leaf inside the (complete) layout.
 */
const TABS = [
  { href: "/", label: "Home", Icon: House },
  { href: "/matches", label: "Matches", Icon: Users },
  { href: "/connections", label: "Connections", Icon: Handshake },
] as const;

function NavTabs({ placement }: { placement: "bottom" | "top" }) {
  const pathname = usePathname();
  const bottom = placement === "bottom";

  return (
    <>
      {TABS.map(({ href, label, Icon }) => {
        // "/" would otherwise prefix-match everything.
        const on = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={
              (bottom
                ? "flex min-w-[72px] flex-col items-center gap-1 rounded-lg px-3 py-1.5 "
                : "flex items-center gap-2 rounded-lg px-3 py-2 ") +
              "transition-colors " +
              (on
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            <Icon
              aria-hidden
              className={bottom ? "size-6" : "size-5"}
              strokeWidth={on ? 2.25 : 1.75}
            />
            <span className="label-caps">{label}</span>
          </Link>
        );
      })}
    </>
  );
}

/** The phone tab bar. Hidden from `md:`, where TopNavTabs takes over. */
export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card md:hidden"
    >
      <div className="mx-auto flex w-full max-w-md items-stretch justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <NavTabs placement="bottom" />
      </div>
    </nav>
  );
}

/** The same tabs inline in the app bar, from `md:` up. Rendered by AppBar. */
export function TopNavTabs() {
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      <NavTabs placement="top" />
    </nav>
  );
}
