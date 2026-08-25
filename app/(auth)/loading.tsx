import { SkeletonCard, SkeletonLine } from "@/components/Skeleton";

/**
 * Login and signup (screen 1).
 *
 * This one matters more than the others: it is the first thing a visitor to the
 * live URL sees, because F1.6 redirects `/` here. Before Phase 7 that redirect
 * landed on nothing at all while the server rendered.
 *
 * Not using SkeletonScreen: the auth layout centres its content vertically, so
 * the skeleton has to match that or it jumps on arrival.
 */
export default function AuthLoading() {
  return (
    <main
      role="status"
      aria-busy="true"
      className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-7 px-6 py-12"
    >
      <span className="sr-only">Loading</span>

      <div className="flex flex-col items-center gap-3">
        <SkeletonLine className="h-8 w-52" />
        <SkeletonLine className="h-4 w-full" />
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <SkeletonLine className="h-3.5 w-24" />
          <SkeletonLine className="h-11 w-full rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <SkeletonLine className="h-3.5 w-20" />
          <SkeletonLine className="h-11 w-full rounded-lg" />
        </div>
        <SkeletonLine className="h-12 w-full rounded-lg" />
      </div>

      <SkeletonLine className="mx-auto h-4 w-44" />

      <SkeletonCard>
        <SkeletonLine className="h-4 w-28" />
        <SkeletonLine className="mt-2 h-3.5 w-40" />
        <SkeletonLine className="mt-3 h-3 w-full" />
        <SkeletonLine className="mt-1.5 h-3 w-full" />
      </SkeletonCard>
    </main>
  );
}
