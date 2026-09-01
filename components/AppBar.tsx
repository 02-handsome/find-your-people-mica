import { Avatar } from "@/components/Avatar";
import { TopNavTabs } from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SHELL } from "@/components/ui";
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
      <div className={`${SHELL} flex h-16 items-center gap-3`}>
        <Avatar src={profile.avatar_url} name={profile.name} size={40} />

        {/* 24px, their headline-lg-mobile: at 375px the full 28px would leave
            almost nothing between a 40px avatar and a 44px control. */}
        {/* Centred on a phone, where it is the only thing between a 40px
            avatar and a 44px control. From md: the tabs sit beside it, so it
            stops stretching and anchors left instead. */}
        <h1 className="min-w-0 flex-1 truncate text-center text-2xl font-bold tracking-[-0.02em] text-primary md:flex-none md:text-left">
          Find Your People
        </h1>

        <TopNavTabs />

        <ThemeToggle />
      </div>
    </header>
  );
}
