"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth";
import {
  areValidDays,
  isValidActivity,
  isValidExperienceLevel,
  isValidTimeWindow,
} from "@/lib/intents";
import { createClient } from "@/lib/supabase/server";

export type IntentFormState = {
  error: string | null;
  /** Echoed back so a rejected submit does not blank the form (AD-11). */
  values?: {
    activity: string;
    days: string[];
    timeStart: string;
    timeEnd: string;
    level: string;
  };
};

function readForm(formData: FormData) {
  return {
    activity: String(formData.get("activity") ?? "").trim(),
    days: formData.getAll("days").map((d) => String(d)),
    timeStart: String(formData.get("time_start") ?? "").trim(),
    timeEnd: String(formData.get("time_end") ?? "").trim(),
    level: String(formData.get("experience_level") ?? "").trim(),
  };
}

/**
 * Server-side validation. Mirrors the constraints in migration 0002 so the user
 * reads a sentence rather than a Postgres error code — the database remains the
 * actual guarantee.
 */
function validate(v: ReturnType<typeof readForm>): string | null {
  if (!isValidActivity(v.activity)) return "Choose an activity.";
  if (!areValidDays(v.days)) return "Choose at least one day.";
  if (!isValidTimeWindow(v.timeStart, v.timeEnd)) {
    return "The end time has to be after the start time.";
  }
  if (!isValidExperienceLevel(v.level)) return "Choose your experience level.";
  return null;
}

/** PRD F2.1 — create. */
export async function createIntentAction(
  _previous: IntentFormState,
  formData: FormData
): Promise<IntentFormState> {
  await requireUserId();

  const values = readForm(formData);
  const problem = validate(values);
  if (problem) return { error: problem, values };

  const supabase = await createClient();

  // Goes through create_intent() rather than a plain insert. That function
  // flips the caller's own lapsed rows to 'expired' and inserts inside ONE
  // transaction — see migration 0003 and docs/notes.md AD-14. Without it, a
  // user whose intent expired still occupies the one-active-intent unique slot
  // and cannot post a replacement.
  const { error } = await supabase.rpc("create_intent", {
    p_activity: values.activity,
    p_days: values.days,
    p_time_start: values.timeStart,
    p_time_end: values.timeEnd,
    p_experience_level: values.level,
  });

  if (error) {
    if (/INTENT_ALREADY_ACTIVE/.test(error.message)) {
      return {
        error: "You already have an active intent. Withdraw it before posting another.",
        values,
      };
    }
    return { error: "Could not post your intent. Please try again.", values };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

/** PRD F2.4 — update days, time window and experience level. */
export async function updateIntentAction(
  _previous: IntentFormState,
  formData: FormData
): Promise<IntentFormState> {
  const userId = await requireUserId();

  const values = readForm(formData);
  const problem = validate(values);
  if (problem) return { error: problem, values };

  const supabase = await createClient();

  // Note what is absent: `activity` and `expires_at`. F2.4 lists days, time
  // window and level as editable and nothing else, and F2.4 is explicit that
  // expires_at does not reset on edit. Even if this object were wrong, the
  // column grant in 0002 would reject both — but the right shape is here so it
  // never has to.
  const { data, error } = await supabase
    .from("intents")
    .update({
      days: values.days,
      time_start: values.timeStart,
      time_end: values.timeEnd,
      experience_level: values.level,
    })
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .select();

  if (error) {
    return { error: "Could not save your changes. Please try again.", values };
  }

  // AD-17 applied in application code: PostgREST reports no error when an
  // UPDATE matches zero rows, so "nothing happened" would otherwise look
  // identical to success. It matches zero if the intent lapsed between the page
  // rendering and this submit.
  if (!data || data.length === 0) {
    return { error: "That intent is no longer active. Post a new one instead.", values };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

/** PRD F2.5 — withdraw, plus OQ-1's auto-decline. */
export async function withdrawIntentAction() {
  await requireUserId();

  const supabase = await createClient();

  // Goes through withdraw_intent() rather than a plain update, because since
  // Phase 6 this is no longer a single-row change: it also declines the pending
  // requests sent FROM this intent, which have just lost their subject
  // (docs/notes.md AD-23). Those two writes must be one transaction — split
  // apart, a failure between them leaves a withdrawn intent with live requests
  // pointing at it, and the recipient can accept a plan that no longer exists.
  //
  // The sender cannot write those rows directly: requests_update_recipient
  // deliberately restricts status changes to the RECIPIENT. So this needs more
  // privilege than the caller has, which is exactly when AD-18 says a
  // SECURITY DEFINER function is justified.
  const { error } = await supabase.rpc("withdraw_intent");

  if (error) {
    console.error("withdraw_intent failed:", error.message);
  }

  // A zero-row outcome is not worth reporting: it means the intent already
  // lapsed or was withdrawn in another tab, and the user's goal — "this should
  // not be live" — is already true. Home renders the real state either way.
  revalidatePath("/", "layout");
  redirect("/");
}
