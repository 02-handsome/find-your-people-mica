"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { withdrawIntentAction } from "@/app/(app)/(complete)/intent/actions";
import { FormError } from "@/components/FormError";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm font-medium underline text-red-700 disabled:opacity-50 dark:text-red-400"
    >
      {pending ? "Withdrawing…" : "Yes, withdraw"}
    </button>
  );
}

/**
 * PRD F2.5 — withdraw, behind an inline confirmation.
 *
 * Withdrawing removes the user from every match pool immediately and, since
 * Phase 6, silently declines the requests they had sent (OQ-1). So it deserves
 * a confirm step. An inline reveal rather than a browser dialog:
 * window.confirm() is untestable, looks foreign on mobile, and blocks the
 * thread. The confirm is the second tap, so the whole action stays within F2's
 * two-tap budget.
 */
export function WithdrawIntent() {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState(withdrawIntentAction, {
    error: null,
  });

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm font-medium underline text-neutral-600 dark:text-neutral-400"
      >
        Withdraw
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {/* Kept visible after a failure so the user can retry, rather than
          collapsing back to the initial state and losing the message. */}
      <FormError message={state.error} />
      <form action={formAction} className="flex items-center gap-3">
        <span className="text-sm">Withdraw this intent?</span>
        <ConfirmButton />
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-sm font-medium underline text-neutral-600 dark:text-neutral-400"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
