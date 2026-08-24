import { redirect } from "next/navigation";

import { getProfile } from "@/lib/auth";
import { isProfileComplete } from "@/lib/profile-options";

/**
 * Routes that require a finished profile (PRD F1.3).
 *
 * This sits one level below (app)/layout.tsx so /profile-setup is inside the
 * auth guard but outside this one — otherwise the redirect below would send
 * /profile-setup to itself.
 *
 * Route groups don't appear in URLs, so (complete)/page.tsx still serves "/".
 */
export default async function CompleteProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!isProfileComplete(profile)) redirect("/profile-setup");

  return <>{children}</>;
}
