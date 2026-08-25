import {
  SkeletonCard,
  SkeletonChips,
  SkeletonCircle,
  SkeletonLine,
  SkeletonScreen,
} from "@/components/Skeleton";

/** Connections (screen 6). */
export default function ConnectionsLoading() {
  return (
    <SkeletonScreen label="Loading your connections">
      <SkeletonLine className="h-7 w-36" />
      <SkeletonLine className="mt-3 h-4 w-full" />

      <div className="mt-8 space-y-4">
        {[0, 1].map((i) => (
          <SkeletonCard key={i}>
            <div className="flex items-start gap-3">
              <SkeletonCircle size={44} />
              <div className="flex-1 space-y-2">
                <SkeletonLine className="h-4 w-28" />
                <SkeletonLine className="h-3.5 w-16" />
              </div>
            </div>
            <div className="mt-3">
              <SkeletonChips count={3} />
            </div>
            {/* The contact block — the reason the screen exists. */}
            <SkeletonLine className="mt-4 h-16 w-full rounded-lg" />
          </SkeletonCard>
        ))}
      </div>
    </SkeletonScreen>
  );
}
