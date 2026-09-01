import { FormSkeleton } from "@/components/FormSkeleton";
import { READABLE, SHELL } from "@/components/ui";

/** Screen 2 — name, year (4 chips), tags (14 chips), contact handle. */
export default function ProfileSetupLoading() {
  // This screen is outside the (complete) shell, so nothing above supplies
  // a column. Without these the skeleton rendered edge-to-edge and the real
  // page then snapped into a centred column.
  return (
    <div className={SHELL}>
      <FormSkeleton
        label="Loading your profile"
        chipRows={[4, 14]}
        className={`${READABLE} py-10`}
      />
    </div>
  );
}
