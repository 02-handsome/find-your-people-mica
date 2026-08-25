"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { respondToRequestAction } from "@/app/(app)/(complete)/requests/actions";
import { Avatar } from "@/components/Avatar";
import { FormError } from "@/components/FormError";
import { BUTTON_PRIMARY, CARD, HINT } from "@/components/ui";
import {
  ACTIVITY_LABELS,
  EXPERIENCE_LABELS,
  formatTimeRange,
} from "@/lib/intents";
import type { IncomingRequest } from "@/lib/requests";

/**
 * A submit button that knows whether IT was the one pressed.
 *
 * useFormStatus() exposes the FormData being submitted, so `decision` says
 * which of the two buttons started this. Without that, a single `pending` flag
 * would put both buttons into a loading state and the user could not tell
 * whether they had accepted or declined.
 */
function DecisionButton({
  value,
  label,
  pendingLabel,
  className,
}: {
  value: "accept" | "decline";
  label: string;
  pendingLabel: string;
  className: string;
}) {
  const { pending, data } = useFormStatus();
  const isThisOne = data?.get("decision") === value;

  return (
    <button
      type="submit"
      name="decision"
      value={value}
      disabled={pending}
      className={`${className} disabled:opacity-50`}
    >
      {pending && isThisOne ? pendingLabel : label}
    </button>
  );
}

/**
 * PRD F4.3 / F4.4 — an incoming request on the recipient's home screen.
 *
 * Shows the sender's name, avatar, tags and intent details, and nothing else.
 * There is no contact_handle here because get_incoming_requests() cannot return
 * one: deciding whether to accept must not require already having what
 * accepting grants.
 *
 * A Client Component since Phase 7, so accepting can report a pending state and
 * a failure. Before that both buttons were plain <button>s in server-action
 * forms: no feedback on a slow connection (so you could tap Accept twice) and a
 * failed accept was silent.
 */
export function IncomingRequestCard({ request }: { request: IncomingRequest }) {
  const [state, formAction] = useActionState(respondToRequestAction, {
    error: null,
  });

  return (
    <li className={CARD}>
      <div className="flex items-start gap-3">
        <Avatar src={request.avatar_url} size={44} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold tracking-tight">
            {request.name}
          </h3>
          <p className={HINT}>{request.year}</p>
        </div>
      </div>

      {request.tags && request.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {request.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs dark:border-neutral-800"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {/* F4.3: "intent details" — what they are actually proposing. */}
      <p className="mt-3 text-sm">
        {ACTIVITY_LABELS[request.activity]} ·{" "}
        {EXPERIENCE_LABELS[request.experience_level]}
      </p>
      <p className={`mt-0.5 text-sm ${HINT}`}>
        {request.days.join(", ")} ·{" "}
        {formatTimeRange(request.time_start, request.time_end)}
      </p>

      <form action={formAction} className="mt-4 space-y-2">
        <input type="hidden" name="request_id" value={request.request_id} />
        <FormError message={state.error} />

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <DecisionButton
              value="accept"
              label="Accept"
              pendingLabel="Accepting…"
              className={BUTTON_PRIMARY}
            />
          </div>
          <DecisionButton
            value="decline"
            label="Decline"
            pendingLabel="Declining…"
            className="px-2 text-sm font-medium underline text-neutral-600 dark:text-neutral-400"
          />
        </div>
      </form>

      <p className={`mt-2.5 ${HINT}`}>
        {/* Says exactly what Accept does, at the moment of the decision. This is
            the one irreversible action in the product: F4.5 reveals both
            handles and AD-16 makes accepted terminal. */}
        Accepting shares your contact handle with them, and theirs with you.
      </p>
    </li>
  );
}
