import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileSetupForm } from "@/components/ProfileSetupForm";
import { HINT } from "@/components/ui";
import { getProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Set up your profile · Find Your People",
};

/**
 * Screen 2 (PRD F1.3).
 *
 * Lives inside (app) — so it requires a session — but outside (complete), so an
 * unfinished profile can actually reach it.
 *
 * Revisiting with a finished profile is allowed rather than redirected away:
 * the form prefills, so this doubles as profile editing for free, and there is
 * no loop risk because the completeness guard is one level down.
 */
export default async function ProfileSetupPage() {
  const profile = await getProfile();

  // The trigger on auth.users creates this row at signup, so a signed-in user
  // without one means something is genuinely wrong rather than merely new.
  if (!profile) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        Set up your profile
      </h1>
      <p className={`mt-2 ${HINT}`}>
        This is what other people see when you match. Takes about a minute.
      </p>

      <ProfileSetupForm profile={profile} />
    </main>
  );
}
