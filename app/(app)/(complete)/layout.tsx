import { redirect } from "next/navigation";

import { AppBar } from "@/components/AppBar";
import { BottomNav } from "@/components/BottomNav";
import { getProfile } from "@/lib/auth";
import { isProfileComplete } from "@/lib/profile-options";

/**
 * Routes that require a finished profile (PRD F1.3), and the shell they share.
 *
 * This sits one level below (app)/layout.tsx so /profile-setup is inside the
 * auth guard but outside this one — otherwise the redirect below would send
 * /profile-setup to itself.
 *
 * Route groups don't appear in URLs, so (complete)/page.tsx still serves "/".
 *
 * getProfile() is cache()d, so the app bar reading the avatar costs nothing:
 * this layout already had to load the profile to make the completeness
 * decision, and the page below asks for the same memoised result.
 */
export default async function CompleteProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!isProfileComplete(profile)) redirect("/profile-setup");

  return (
    <div className="min-h-dvh bg-background">
      <AppBar profile={profile!} />

      {/* pt-16 clears the fixed bar, pb-28 clears the fixed nav. */}
      <div className="mx-auto w-full max-w-md px-5 pt-16 pb-28">{children}</div>

      <BottomNav />
    </div>
  );
}
