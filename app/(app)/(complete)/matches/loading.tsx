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
 * The block between the avatar row and the day chips stands in for the reason
 * line. It is the tallest thing inside a card after the button, so leaving it
 * out would make every card land shorter than its placeholder.
 */
export default function MatchesLoading() {
  return (
    <SkeletonScreen label="Finding your matches">
      <SkeletonLine className="h-7 w-40" />
      <SkeletonLine className="mt-3 h-4 w-full" />

      <div className="mt-8 space-y-4">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i}>
            <div className="flex items-start gap-3">
              <SkeletonCircle size={44} />
              <div className="flex-1 space-y-2">
                <SkeletonLine className="h-4 w-28" />
                <SkeletonLine className="h-3.5 w-36" />
              </div>
            </div>
            {/* the reason line */}
            <SkeletonLine className="mt-3.5 h-11 w-full rounded-lg" />
            <div className="mt-3">
              <SkeletonChips count={7} />
            </div>
            <div className="mt-3">
              <SkeletonChips count={3} />
            </div>
            <SkeletonLine className="mt-4 h-12 w-full rounded-lg" />
            <SkeletonLine className="mt-2 h-8 w-full" />
          </SkeletonCard>
        ))}
      </div>
    </SkeletonScreen>
  );
}
