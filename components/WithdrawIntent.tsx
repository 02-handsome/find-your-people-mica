"use client";

import { useState } from "react";

import { withdrawIntentAction } from "@/app/(app)/(complete)/intent/actions";

/**
 * PRD F2.5 — withdraw, behind an inline confirmation.
 *
 * Withdrawing removes the user from every match pool immediately, so it
 * deserves a confirm step. An inline reveal rather than a browser dialog:
 * window.confirm() is untestable, looks foreign on mobile, and blocks the
 * thread. This keeps the whole action at exactly two taps from home, which is
 * F2's acceptance criterion.
 */
export function WithdrawIntent() {
  const [confirming, setConfirming] = useState(false);

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
    <form action={withdrawIntentAction} className="flex items-center gap-3">
      <span className="text-sm">Withdraw this intent?</span>
      <button
        type="submit"
        className="text-sm font-medium underline text-red-700 dark:text-red-400"
      >
        Yes, withdraw
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-sm font-medium underline text-neutral-600 dark:text-neutral-400"
      >
        Cancel
      </button>
    </form>
  );
}
