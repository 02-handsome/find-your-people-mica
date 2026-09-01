import { SkeletonChips, SkeletonLine, SkeletonScreen } from "@/components/Skeleton";

/**
 * Shared skeleton for the two chip-and-field forms — profile setup (screen 2)
 * and post/edit intent (screen 3). They have the same shape: a heading, a line
 * of explanation, then alternating labels, inputs and chip rows.
 *
 * One component rather than three near-identical loading files, for the same
 * reason ChipGroup replaced five pickers.
 */
export function FormSkeleton({
  label,
  chipRows,
  className,
}: {
  label: string;
  /** Chip counts, in order, for each picker on the form. */
  chipRows: number[];
  /** Passed straight to SkeletonScreen — see the note there. */
  className?: string;
}) {
  return (
    <SkeletonScreen label={label} className={className}>
      <SkeletonLine className="h-7 w-48" />
      <SkeletonLine className="mt-3 h-4 w-full" />

      <div className="mt-6 space-y-6">
        <div className="space-y-1.5">
          <SkeletonLine className="h-3.5 w-24" />
          <SkeletonLine className="h-11 w-full rounded-lg" />
        </div>

        {chipRows.map((count, i) => (
          <div key={i} className="space-y-2">
            <SkeletonLine className="h-3.5 w-36" />
            <SkeletonChips count={count} />
          </div>
        ))}

        <div className="space-y-1.5">
          <SkeletonLine className="h-3.5 w-40" />
          <SkeletonLine className="h-11 w-full rounded-lg" />
        </div>

        <SkeletonLine className="h-12 w-full rounded-lg" />
      </div>
    </SkeletonScreen>
  );
}
