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
      className="py-3 text-sm font-semibold underline text-destructive disabled:opacity-50"
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
 *
 * The confirm row takes the full width of its wrapping flex row rather than
 * sitting beside Edit: at 375px the question plus two answers has nowhere near
 * enough room next to another button.
 *
 * "Yes, withdraw" is the one place red survives as a warning rather than as
 * the brand. It is the only genuinely destructive act in the product, and it
 * only appears after a deliberate first tap — unlike Decline, it never sits
 * next to the primary button, so there is no traffic light to read.
 */
export function WithdrawIntent({ className = "" }: { className?: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState(withdrawIntentAction, {
    error: null,
  });

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={className}
      >
        Withdraw
      </button>
    );
  }

  return (
    <div className="w-full space-y-2">
      {/* Kept visible after a failure so the user can retry, rather than
          collapsing back to the initial state and losing the message. */}
      <FormError message={state.error} />
      <form action={formAction} className="flex flex-wrap items-center gap-x-4">
        <span className="text-sm">Withdraw this intent?</span>
        <ConfirmButton />
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="py-3 text-sm font-medium underline text-muted-foreground"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
