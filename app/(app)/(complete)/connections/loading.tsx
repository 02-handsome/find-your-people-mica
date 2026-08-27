import {
  SkeletonCard,
  SkeletonChips,
  SkeletonCircle,
  SkeletonLine,
  SkeletonScreen,
} from "@/components/Skeleton";

/**
 * Connections (screen 6). Mirrors the real card: avatar row with the MATCHED
 * pill, a rule, then the revealed handle and its action.
 */
export default function ConnectionsLoading() {
  return (
    <SkeletonScreen label="Loading your connections">
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <SkeletonLine className="h-6 w-40" />
          <SkeletonLine className="h-4 w-full" />
        </div>

        <div className="space-y-4">
          {[0, 1].map((i) => (
            <SkeletonCard key={i}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-1 items-center gap-3">
                  <SkeletonCircle size={48} />
                  <div className="flex-1 space-y-2">
                    <SkeletonLine className="h-5 w-28" />
                    <SkeletonLine className="h-4 w-36" />
                  </div>
                </div>
                <SkeletonLine className="h-6 w-24 rounded-full" />
              </div>

              <div className="mt-3">
                <SkeletonChips count={3} />
              </div>

              <hr className="my-4 border-border" />

              <div className="flex items-center gap-3">
                <SkeletonCircle size={40} />
                <SkeletonLine className="h-8 w-40" />
              </div>
              <SkeletonLine className="mt-4 h-12 w-full rounded-lg" />
            </SkeletonCard>
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}
