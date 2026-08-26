import { Avatar } from "@/components/Avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Profile } from "@/lib/profile-options";

/**
 * The fixed top bar on every completed-profile screen: avatar, wordmark, and
 * the control on the right.
 *
 * Stitch puts a settings gear in that slot. There is no settings screen, and a
 * control that does nothing is worse than no control — so the slot holds the
 * theme toggle, which is a real setting and the only one this app has. It also
 * puts the toggle in the same corner as on login.
 *
 * Fixed, full-bleed background with the contents constrained to the same
 * max-w-md column as the page, so content scrolling underneath is covered
 * edge to edge rather than only under the column.
 */
export function AppBar({ profile }: { profile: Profile }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-16 w-full max-w-md items-center gap-3 px-5">
        <Avatar src={profile.avatar_url} name={profile.name} size={40} />

        {/* 24px, their headline-lg-mobile: at 375px the full 28px would leave
            almost nothing between a 40px avatar and a 44px control. */}
        <h1 className="min-w-0 flex-1 truncate text-center text-2xl font-bold tracking-[-0.02em] text-primary">
          Find Your People
        </h1>

        <ThemeToggle />
      </div>
    </header>
  );
}
