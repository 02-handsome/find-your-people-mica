"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type SendRequestState = { sent: boolean; error: string | null };

/** PRD F4.1 — send a connection request from a match card. */
export async function sendRequestAction(
  _previous: SendRequestState,
  formData: FormData
): Promise<SendRequestState> {
  await requireUserId();

  const toUserId = String(formData.get("to_user_id") ?? "").trim();
  if (!toUserId) return { sent: false, error: "Missing recipient." };

  const supabase = await createClient();

  // send_request() derives the sender and their active intent from the session
  // and refuses anyone not currently in the caller's matches. Nothing about who
  // is sending, or on behalf of which intent, comes from this form.
  const { error } = await supabase.rpc("send_request", { p_to_user_id: toUserId });

  if (error) {
    if (/NOT_A_CURRENT_MATCH/.test(error.message)) {
      return { sent: false, error: "They're no longer in your matches. Refresh to see who is." };
    }
    if (/NO_ACTIVE_INTENT/.test(error.message)) {
      return { sent: false, error: "Post an intent before sending requests." };
    }
    if (/requests_one_open_per_pair|duplicate key/.test(error.message)) {
      // F4.2 — the unique index is what makes this un-resendable. Reaching here
      // means a double submit, so report it as the success it effectively is.
      return { sent: true, error: null };
    }
    return { sent: false, error: "Could not send that request. Please try again." };
  }

  // Deliberately NO revalidatePath here.
  //
  // F3.1 excludes anyone with an open request from the candidate pool, so
  // revalidating would make the card vanish mid-interaction. F4.2 wants the
  // opposite: "the sender's view of that card changes to 'Request sent'".
  // Leaving the page as-is lets the card flip to that state and stay there;
  // the next load recomputes the pool and they are correctly gone. Both
  // requirements hold, which they cannot if this revalidates.
  return { sent: true, error: null };
}

/** PRD F4.4 — the recipient accepts. This is what reveals contact (F4.5). */
export async function acceptRequestAction(formData: FormData) {
  await requireUserId();
  await setStatus(String(formData.get("request_id") ?? ""), "accepted");
}

/** PRD F4.4 — the recipient declines. Silent to the sender (F4.6). */
export async function declineRequestAction(formData: FormData) {
  await requireUserId();
  await setStatus(String(formData.get("request_id") ?? ""), "declined");
}

/**
 * A plain update, not a SECURITY DEFINER function.
 *
 * Three independent controls already cover it, so a privileged wrapper would
 * add a second privileged path for nothing (docs/notes.md AD-18):
 *   - RLS `requests_update_recipient` restricts status writes to the recipient
 *   - the column grant allows only `status` to be written
 *   - the AD-16 trigger permits only pending -> accepted | declined
 */
async function setStatus(requestId: string, status: "accepted" | "declined") {
  if (!requestId) return;

  const supabase = await createClient();

  await supabase.from("requests").update({ status }).eq("id", requestId);

  // A zero-row result is not an error worth surfacing: it means the request was
  // already resolved, or belongs to someone else and RLS filtered it out. Home
  // re-renders from the database either way, so it shows the truth.
  revalidatePath("/", "layout");
}
