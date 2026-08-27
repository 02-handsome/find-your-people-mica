import Link from "next/link";

/**
 * The Log In / Sign Up segmented control from the Stitch login screen.
 *
 * Stitch implements it as two buttons swapping two forms in place with a
 * 300ms crossfade. Here they are two LINKS, because /login and /signup are
 * separate routes behind the (auth) guard and always have been — the control
 * reflects the route rather than replacing it.
 *
 * That is the better trade for this app: the tab state survives a reload, each
 * form keeps its own URL and its own metadata title, and the whole thing works
 * with no JavaScript. What is lost is the crossfade.
 */
export function AuthTabs({ active }: { active: "login" | "signup" }) {
  const tabs = [
    { key: "login" as const, href: "/login", label: "Log In" },
    { key: "signup" as const, href: "/signup", label: "Sign Up" },
  ];

  return (
    <div
      className="flex rounded-full bg-track p-1"
      role="tablist"
      aria-label="Log in or sign up"
    >
      {tabs.map((tab) => {
        const on = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            role="tab"
            aria-selected={on}
            aria-current={on ? "page" : undefined}
            className={
              "flex-1 rounded-full py-2.5 text-center text-base font-semibold transition-colors " +
              (on
                ? "bg-card text-foreground shadow-(--shadow-card)"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
