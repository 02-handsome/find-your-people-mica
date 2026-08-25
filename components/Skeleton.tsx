/**
 * Skeleton pieces for the loading.tsx files.
 *
 * These mirror the SHAPES of the real content — same card borders, same avatar
 * size, same number of chips — so nothing jumps when the data arrives. A
 * centred spinner would be less code and worse: it tells the user to wait
 * without telling them what for, and then the layout snaps into place.
 *
 * Every route in this app is a dynamic Server Component, so before Phase 7
 * there was no loading UI at all: a navigation blocked on a server round-trip
 * showing nothing. On mobile data that is the blank screen CLAUDE.md forbids.
 */

/** A grey bar. Pass width/height via Tailwind classes. */
export function SkeletonLine({ className = "h-4 w-full" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded bg-neutral-200 dark:bg-neutral-800 ${className}`}
    />
  );
}

export function SkeletonCircle({ size = 56 }: { size?: number }) {
  return (
    <div
      aria-hidden
      style={{ width: size, height: size }}
      className="shrink-0 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800"
    />
  );
}

/** `count` pill-shaped placeholders, for tag and day rows. */
export function SkeletonChips({ count = 3 }: { count?: number }) {
  return (
    <div aria-hidden className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-7 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800"
          // Varied widths, so it reads as text rather than as a progress bar.
          style={{ width: 56 + ((i * 23) % 40) }}
        />
      ))}
    </div>
  );
}

/** Matches the CARD class from components/ui.ts. */
export function SkeletonCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      {children}
    </div>
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
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <main
      role="status"
      aria-busy="true"
      className="mx-auto w-full max-w-sm px-6 py-10"
    >
      <span className="sr-only">{label}</span>
      {children}
    </main>
  );
}
