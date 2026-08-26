"use client";

import { Handshake, House, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The bottom tab bar from the Stitch screens. Replaces the text links that
 * used to sit at the foot of each page.
 *
 * ONE DELIBERATE DEPARTURE: Stitch uses a chat bubble for Connections. This
 * app has no messaging and never will — in-app chat is the first item on the
 * PRD's non-goals list, and the whole point of F4.5 is that it hands you a
 * phone number and gets out of the way. A speech bubble in the navigation
 * would promise a feature that does not exist, so Connections gets a handshake
 * instead, matching the icon already used on that screen's empty state.
 *
 * A Client Component, and the only reason is usePathname() for the active tab.
 * No boundary moved: it is a leaf inside the (complete) layout.
 */
const TABS = [
  { href: "/", label: "Home", Icon: House },
  { href: "/matches", label: "Matches", Icon: Users },
  { href: "/connections", label: "Connections", Icon: Handshake },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card"
    >
      <div className="mx-auto flex w-full max-w-md items-stretch justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {TABS.map(({ href, label, Icon }) => {
          // "/" would otherwise prefix-match everything.
          const on = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className={
                "flex min-w-[72px] flex-col items-center gap-1 rounded-lg px-3 py-1.5 transition-colors " +
                (on
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              <Icon
                aria-hidden
                className="size-6"
                strokeWidth={on ? 2.25 : 1.75}
              />
              <span className="label-caps">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
