import { FormSkeleton } from "@/components/FormSkeleton";

/** Screen 2 — name, year (4 chips), tags (14 chips), contact handle. */
export default function ProfileSetupLoading() {
  return <FormSkeleton label="Loading your profile" chipRows={[4, 14]} />;
}
