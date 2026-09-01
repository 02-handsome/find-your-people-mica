/**
 * A fixed action bar pinned to the bottom of the viewport, matching the
 * "Complete Setup" bar on the Stitch profile screen.
 *
 * Only used on /profile-setup, and only because that screen sits OUTSIDE the
 * (complete) shell and therefore has no bottom nav to collide with. The intent
 * form lives inside the shell, where the bottom of the screen already belongs
 * to navigation, so it keeps an inline submit at the end of the form instead
 * of stacking two fixed bars.
 *
 * Renders inside the <form>; position has no bearing on form association, so
 * the button still submits.
 */
import { READABLE, SHELL } from "@/components/ui";

export function StickyActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background">
      <div className={`${SHELL} pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]`}>
        {/* Same inner cap as the form above it, or the button would drift
            wider than the fields it submits. */}
        <div className={READABLE}>{children}</div>
      </div>
    </div>
  );
}
