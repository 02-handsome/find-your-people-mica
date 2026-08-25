import {
  SkeletonCard,
  SkeletonChips,
  SkeletonCircle,
  SkeletonLine,
  SkeletonScreen,
} from "@/components/Skeleton";

/** Home (screen 4). Mirrors header → tags → intent card → contact card. */
export default function HomeLoading() {
  return (
    <SkeletonScreen label="Loading your home screen">
      <div className="flex items-center gap-3">
        <SkeletonCircle />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-5 w-32" />
          <SkeletonLine className="h-3.5 w-16" />
        </div>
      </div>

      <div className="mt-6">
        <SkeletonChips count={3} />
      </div>

      <div className="mt-8 space-y-6">
        <SkeletonCard>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <SkeletonLine className="h-5 w-20" />
              <SkeletonLine className="h-3.5 w-14" />
            </div>
            <SkeletonLine className="h-6 w-24 rounded-full" />
          </div>
          <div className="mt-4">
            <SkeletonChips count={7} />
          </div>
          <SkeletonLine className="mt-3 h-4 w-28" />
        </SkeletonCard>

        <SkeletonCard>
          <SkeletonLine className="h-4 w-32" />
          <SkeletonLine className="mt-2 h-4 w-24" />
        </SkeletonCard>
      </div>
    </SkeletonScreen>
  );
}
