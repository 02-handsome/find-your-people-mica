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

export type ProfileFormState = {
  error: string | null;
  /**
   * The values the user submitted, echoed back so the form can re-fill itself.
   *
   * React 19 resets uncontrolled fields once a form action completes, so
   * without this a single mistyped digit in the phone number would clear the
   * name and year the user had already typed — on a mobile keyboard, the
   * fastest way to make someone abandon onboarding.
   */
  values?: {
    name: string;
    year: string;
    tags: string[];
    contactHandle: string;
  };
};

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

  // Returned with every failure so nothing the user typed is lost.
  const values = { name, year, tags, contactHandle: contactRaw };

  // Validated here, on the server, not just in the browser. The client-side
  // limits in ChipGroup are for feedback; these are the rules.
  if (name.length < 2) {
    return { error: "Please enter your name.", values };
  }
  if (!isValidYear(year)) {
    return { error: "Please choose your year.", values };
  }
  if (!areValidTags(tags)) {
    return { error: `Pick exactly ${TAGS_REQUIRED} tags from the list.`, values };
  }
  if (!isValidContactHandle(contactRaw)) {
    return {
      error: "Enter a valid 10-digit mobile number so matches can reach you.",
      values,
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
    return { error: "Could not save your profile. Please try again.", values };
  }

  // (complete)/layout.tsx reads the profile to decide whether to bounce the
  // user back here, so its cached render has to be invalidated or the redirect
  // below lands straight back on this page.
  revalidatePath("/", "layout");
  redirect("/");
}
