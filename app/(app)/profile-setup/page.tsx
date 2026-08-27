import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileSetupForm } from "@/components/ProfileSetupForm";
import { ThemeToggle } from "@/components/ThemeToggle";
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
    <main className="mx-auto w-full max-w-md px-5 py-10">
      {/* This screen sits outside the (complete) shell — you pass through it
          once, and navigating away from it would only be bounced back by the
          completeness guard — so it carries its own header rather than the app
          bar. The toggle keeps the same top-right corner it has everywhere. */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] leading-7 font-semibold tracking-tight text-primary">
            {editing ? "Edit Profile" : "Setup Profile"}
          </h1>
          <p className={`mt-1.5 ${HINT}`}>
            {editing
              ? "Changes apply to anyone you match with from now on."
              : "Complete your profile to start connecting. Only share what you're comfortable with."}
          </p>
        </div>
        <ThemeToggle />
      </div>

      <ProfileSetupForm profile={profile} editing={editing} />
    </main>
  );
}
