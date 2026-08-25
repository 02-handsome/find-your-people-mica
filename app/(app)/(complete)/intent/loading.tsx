import { FormSkeleton } from "@/components/FormSkeleton";

/**
 * Screen 3 — activity (3 chips), days (7 chips), time window, level (3 chips).
 *
 * One file at the `intent/` segment covers both `new` and `edit`: Next resolves
 * the nearest loading.tsx up the tree, and the two forms are the same shape.
 */
export default function IntentLoading() {
  return <FormSkeleton label="Loading the intent form" chipRows={[3, 7, 3]} />;
}
