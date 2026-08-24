"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/** PRD F1.5 — log out. */
export async function signOutAction() {
  const supabase = await createClient();

  // No auth check needed before signing out: signing out an already-signed-out
  // caller is a no-op, and failing loudly here would be worse than harmless.
  await supabase.auth.signOut();

  redirect("/login");
}
