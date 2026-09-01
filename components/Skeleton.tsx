import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton pieces for the loading.tsx files.
 *
 * These mirror the SHAPES of the real content — same card, same avatar size,
 * same number of chips — so nothing jumps when the data arrives. A centred
 * spinner would be less code and worse: it tells the user to wait without
 * telling them what for, and then the layout snaps into place.
 *
 * Every route in this app is a dynamic Server Component, so before Phase 7
 * there was no loading UI at all: a navigation blocked on a server round-trip
 * showing nothing. On mobile data that is the blank screen CLAUDE.md forbids.
 *
 * The primitive is shadcn's `Skeleton`; what lives here is this app's own
 * vocabulary of shapes built from it. SkeletonCard in particular renders the
 * REAL `Card`, so a loading card cannot drift out of step with a loaded one —
 * it is the same component, holding placeholders.
 */

/** A bar. Pass width/height via Tailwind classes. */
export function SkeletonLine({
  className = "h-4 w-full",
}: {
  className?: string;
}) {
  return <Skeleton aria-hidden className={`rounded ${className}`} />;
}

export function SkeletonCircle({ size = 56 }: { size?: number }) {
  return (
    <Skeleton
      aria-hidden
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full"
    />
  );
}

/** `count` pill-shaped placeholders, for tag and day rows. */
export function SkeletonChips({ count = 3 }: { count?: number }) {
  return (
    <div aria-hidden className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-7 rounded-full"
          // Varied widths, so it reads as text rather than as a progress bar.
          style={{ width: 56 + ((i * 23) % 40) }}
        />
      ))}
    </div>
  );
}

/** The real Card, holding placeholders. */
export function SkeletonCard({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * Wraps a whole loading screen. role="status" + aria-busy so assistive tech
 * announces that something is coming rather than reading out grey boxes; the
 * sr-only line is what actually gets spoken.
 */
export function SkeletonScreen({
  label,
  children,
  /**
   * Column and padding for this screen. Defaults to the in-shell case,
   * where (complete)/layout supplies the column. A screen outside that
   * shell has to pass its own, or the skeleton renders edge-to-edge and
   * then snaps into a column when the real page lands.
   */
  className = "py-6",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </main>
  );
}
