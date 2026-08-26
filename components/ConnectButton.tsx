"use client";

import { useActionState } from "react";

import { sendRequestAction } from "@/app/(app)/(complete)/requests/actions";
import { FormError } from "@/components/FormError";
import { SubmitButton } from "@/components/SubmitButton";
import { HINT } from "@/components/ui";
import { REQUEST_SENT_LABEL } from "@/lib/requests";

/**
 * PRD F4.1 and F4.2.
 *
 * Per-card action state, which is why this is its own component rather than
 * logic inside MatchCard: each card needs to flip independently, and
 * useActionState cannot be shared across a list.
 *
 * Once sent, the button is replaced rather than disabled. A disabled button
 * still reads as "you could do this"; replacing it states what happened. The
 * card then persists in that state for the rest of the visit — the send action
 * deliberately does not revalidate, because F3.1 would otherwise remove this
 * person from the pool and the card would vanish mid-interaction.
 */
export function ConnectButton({ toUserId }: { toUserId: string }) {
  const [state, formAction] = useActionState(sendRequestAction, {
    sent: false,
    error: null,
  });

  if (state.sent) {
    return (
      <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm font-medium">
        {REQUEST_SENT_LABEL}
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-4 space-y-2">
      <input type="hidden" name="to_user_id" value={toUserId} />
      <FormError message={state.error} />
      <SubmitButton pendingLabel="Sending…">Connect</SubmitButton>
      <p className={HINT}>
        {/* Set expectations before the tap, not after. Nothing is shared yet,
            and F4.6 means a decline will never be reported back. */}
        They&rsquo;ll see your intent, not your number. Contact is shared only if
        they accept.
      </p>
    </form>
  );
}
