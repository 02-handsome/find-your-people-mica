"use client";

import { Check, X } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { respondToRequestAction } from "@/app/(app)/(complete)/requests/actions";
import { Avatar } from "@/components/Avatar";
import { FormError } from "@/components/FormError";
import { OverlapLine } from "@/components/OverlapLine";
import { BUTTON_NEUTRAL, BUTTON_PRIMARY, CHIP, HINT } from "@/components/ui";
import { Card, CardContent } from "@/components/ui/card";
import type { ViewerWindow } from "@/lib/overlap";
import { ACTIVITY_LABELS, EXPERIENCE_LABELS, formatTimeRange } from "@/lib/intents";
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
  children,
}: {
  value: "accept" | "decline";
  label: string;
  pendingLabel: string;
  className: string;
  children: React.ReactNode;
}) {
  const { pending, data } = useFormStatus();
  const isThisOne = data?.get("decision") === value;

  return (
    <button
      type="submit"
      name="decision"
      value={value}
      disabled={pending}
      className={className}
    >
      {children}
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
export function IncomingRequestCard({
  request,
  viewer,
}: {
  request: IncomingRequest;
  /**
   * Null when the recipient has withdrawn their own intent — then there is no
   * "both of you" left to describe and the reason line is simply not drawn.
   */
  viewer: ViewerWindow | null;
}) {
  const [state, formAction] = useActionState(respondToRequestAction, {
    error: null,
  });

  return (
    <li>
      <Card>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar src={request.avatar_url} name={request.name} size={56} />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg leading-tight font-semibold tracking-tight">
                {request.name}
              </h3>
              <p className={`mt-1 ${HINT}`}>
                {request.year} · {EXPERIENCE_LABELS[request.experience_level]}
              </p>
            </div>
          </div>

          {/* The same reason line the match card shows, for the same purpose:
              it says the two of you arrived here by posting the same thing. */}
          <OverlapLine
            className="mt-4"
            viewer={viewer}
            days={request.days}
            timeStart={request.time_start}
            timeEnd={request.time_end}
          />

          {request.tags && request.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {request.tags.map((tag) => (
                <span key={tag} className={CHIP}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          {/* F4.3: "intent details" — what they are actually proposing. */}
          <p className={`mt-3 ${HINT}`}>
            {ACTIVITY_LABELS[request.activity]} · {request.days.join(", ")} ·{" "}
            {formatTimeRange(request.time_start, request.time_end)}
          </p>

          <form action={formAction} className="mt-4 space-y-2">
            <input type="hidden" name="request_id" value={request.request_id} />
            <FormError message={state.error} />

            {/* Equal weight, side by side, the way Stitch pairs them. Decline
                stays NEUTRAL rather than red: declining is silent and ordinary
                (F4.6), and red beside the red primary would read as a traffic
                light. */}
            <div className="flex items-center gap-3">
              <DecisionButton
                value="accept"
                label="Accept"
                pendingLabel="Accepting…"
                className={`${BUTTON_PRIMARY} flex-1`}
              >
                <Check aria-hidden className="size-5" strokeWidth={2.25} />
              </DecisionButton>
              <DecisionButton
                value="decline"
                label="Decline"
                pendingLabel="Declining…"
                className={`${BUTTON_NEUTRAL} flex-1`}
              >
                <X aria-hidden className="size-5" strokeWidth={2.25} />
              </DecisionButton>
            </div>
          </form>

          <p className={`mt-3 ${HINT}`}>
            {/* Says exactly what Accept does, at the moment of the decision.
                This is the one irreversible action in the product: F4.5
                reveals both handles and AD-16 makes accepted terminal. */}
            Accepting shares your contact handle with them, and theirs with you.
          </p>
        </CardContent>
      </Card>
    </li>
  );
}
