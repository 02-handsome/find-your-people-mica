import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileSetupForm } from "@/components/ProfileSetupForm";
import { HINT } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { isProfileComplete } from "@/lib/profile-options";

/**
 * Dynamic because this page serves both onboarding and editing, and a tab
 * reading "Set up your profile" while the heading says "Edit your profile" is
 * the kind of mismatch that reads as a bug. getProfile() is cache()d, so this
 * shares the page's query rather than adding one.
 */
export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();

  return {
    title: isProfileComplete(profile)
      ? "Edit your profile · Find Your People"
      : "Set up your profile · Find Your People",
  };
}

/**
 * Screen 2 (PRD F1.3).
 *
 * Lives inside (app) — so it requires a session — but outside (complete), so an
 * unfinished profile can actually reach it.
 *
 * Serves two jobs: first-run onboarding (F1.3) and, deliberately, ongoing
 * editing (AD-11). A finished profile is NOT redirected away — contact_handle
 * has to stay correctable, because F4.5 reveals it on mutual accept and a typo
 * would otherwise hand out a wrong number permanently.
 */
export default async function ProfileSetupPage() {
  const profile = await getProfile();

  // The trigger on auth.users creates this row at signup, so a signed-in user
  // without one means something is genuinely wrong rather than merely new.
  if (!profile) redirect("/login");

  const editing = isProfileComplete(profile);

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        {editing ? "Edit your profile" : "Set up your profile"}
      </h1>
      <p className={`mt-2 ${HINT}`}>
        {editing
          ? "Changes apply to anyone you match with from now on."
          : "This is what other people see when you match. Takes about a minute."}
      </p>

      <ProfileSetupForm profile={profile} editing={editing} />
    </main>
  );
}
