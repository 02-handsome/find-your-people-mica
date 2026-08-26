import {
  SkeletonCard,
  SkeletonChips,
  SkeletonLine,
  SkeletonScreen,
} from "@/components/Skeleton";

/**
 * Home (screen 4). Mirrors the real order: section heading → intent card →
 * contact card.
 *
 * No avatar placeholder any more — the avatar moved into the app bar, which is
 * part of the layout and therefore already painted before this renders.
 */
export default function HomeLoading() {
  return (
    <SkeletonScreen label="Loading your home screen">
      <div className="flex flex-col gap-8">
        <div>
          <SkeletonLine className="mb-3 h-6 w-44" />
          <SkeletonCard>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <SkeletonLine className="h-4 w-24" />
                <SkeletonLine className="h-6 w-32" />
              </div>
              <SkeletonLine className="h-7 w-28 rounded-md" />
            </div>
            <div className="mt-4">
              <SkeletonChips count={7} />
            </div>
            <div className="mt-3">
              <SkeletonChips count={1} />
            </div>
            <div className="mt-5 flex gap-3">
              <SkeletonLine className="h-12 flex-1 rounded-lg" />
              <SkeletonLine className="h-12 flex-1 rounded-lg" />
            </div>
          </SkeletonCard>
        </div>

        <SkeletonCard>
          <SkeletonLine className="h-4 w-40" />
          <SkeletonLine className="mt-2 h-5 w-28" />
          <SkeletonLine className="mt-2 h-4 w-full" />
        </SkeletonCard>
      </div>
    </SkeletonScreen>
  );
}
