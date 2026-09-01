import {
  SkeletonCard,
  SkeletonChips,
  SkeletonCircle,
  SkeletonLine,
  SkeletonScreen,
} from "@/components/Skeleton";

/**
 * Matches (screen 5). Three cards, because F3.3 returns at most three — so the
 * skeleton is the right height and the page does not resize when data lands.
 *
 * Mirrors the real card in order: avatar row, tags, rule, the shared-hours
 * label row, the seven day circles, then the button and its note.
 */
export default function MatchesLoading() {
  return (
    <SkeletonScreen label="Finding your matches">
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <SkeletonLine className="h-6 w-44" />
            <SkeletonLine className="h-4 w-full" />
          </div>
          <SkeletonLine className="h-7 w-24 rounded-full" />
        </div>

        <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i}>
              <div className="flex items-start gap-4">
                <SkeletonCircle size={64} />
                <div className="flex-1 space-y-2">
                  <SkeletonLine className="h-6 w-32" />
                  <SkeletonLine className="h-4 w-40" />
                </div>
                <SkeletonLine className="h-7 w-20 rounded-md" />
              </div>

              <div className="mt-3">
                <SkeletonChips count={3} />
              </div>

              <hr className="my-4 border-border" />

              <div className="flex items-center justify-between">
                <SkeletonLine className="h-4 w-28" />
                <SkeletonLine className="h-4 w-24" />
              </div>

              <div className="mt-3 flex justify-between">
                {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                  <SkeletonCircle key={d} size={32} />
                ))}
              </div>

              <SkeletonLine className="mt-5 h-12 w-full rounded-lg" />
              <SkeletonLine className="mt-2 h-8 w-full" />
            </SkeletonCard>
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}
