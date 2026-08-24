"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth";
import {
  areValidTags,
  isValidContactHandle,
  isValidYear,
  normalizeContactHandle,
  TAGS_REQUIRED,
} from "@/lib/profile-options";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = { error: string | null };

/** PRD F1.3 — complete the profile: name, year, 3 tags, contact handle. */
export async function saveProfileAction(
  _previous: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  // Establishes identity independently of the layout guard. See lib/auth.ts.
  const userId = await requireUserId();

  const name = String(formData.get("name") ?? "").trim();
  const year = String(formData.get("year") ?? "").trim();
  const tags = formData.getAll("tags").map((value) => String(value));
  const contactRaw = String(formData.get("contact_handle") ?? "");

  // Validated here, on the server, not just in the browser. The client-side
  // limits in TagPicker are for feedback; these are the rules.
  if (name.length < 2) {
    return { error: "Please enter your name." };
  }
  if (!isValidYear(year)) {
    return { error: "Please choose your year." };
  }
  if (!areValidTags(tags)) {
    return { error: `Pick exactly ${TAGS_REQUIRED} tags from the list.` };
  }
  if (!isValidContactHandle(contactRaw)) {
    return {
      error: "Enter a valid 10-digit mobile number so matches can reach you.",
    };
  }

  const supabase = await createClient();

  // .eq("id", userId) is redundant while RLS restricts updates to the caller's
  // own row. Kept deliberately: if a policy is ever loosened, this still scopes
  // the write. Cheap belt to go with the braces.
  const { error } = await supabase
    .from("users")
    .update({
      name,
      year,
      tags,
      contact_handle: normalizeContactHandle(contactRaw),
    })
    .eq("id", userId);

  if (error) {
    return { error: "Could not save your profile. Please try again." };
  }

  // (complete)/layout.tsx reads the profile to decide whether to bounce the
  // user back here, so its cached render has to be invalidated or the redirect
  // below lands straight back on this page.
  revalidatePath("/", "layout");
  redirect("/");
}
