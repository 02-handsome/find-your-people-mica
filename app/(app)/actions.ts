"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type SignOutState = { error: string | null };

/**
 * PRD F1.5 — log out.
 *
 * No auth check needed first: signing out an already-signed-out caller is a
 * no-op.
 *
 * It DOES need its error checked, though, which it did not before Phase 7. If
 * signOut fails the cookie survives, so the redirect to /login hits
 * (auth)/layout, which sees a valid session and sends the user straight back to
 * home. They tapped "Log out", ended up on the home screen still logged in, and
 * were told nothing.
 */
export async function signOutAction(
  _previous: SignOutState,
  _formData: FormData
): Promise<SignOutState> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: "Could not log you out. Please try again." };
  }

  redirect("/login");
}
