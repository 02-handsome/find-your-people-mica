"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { respondToRequestAction } from "@/app/(app)/(complete)/requests/actions";
import { Avatar } from "@/components/Avatar";
import { FormError } from "@/components/FormError";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BUTTON_NEUTRAL, BUTTON_PRIMARY, HINT } from "@/components/ui";
import type { ViewerWindow } from "@/components/MatchCard";
import {
  ACTIVITY_LABELS,
  EXPERIENCE_LABELS,
  describeSharedDays,
  formatTimeRange,
  overlapWindow,
  sharedDays,
  toHHMM,
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
      className={className}
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

  const shared = viewer ? sharedDays(viewer.days, request.days) : [];
  const overlap = viewer
    ? overlapWindow(
        viewer.time_start,
        viewer.time_end,
        request.time_start,
        request.time_end
      )
    : null;

  return (
    <li>
      <Card>
        <CardContent>
          <div className="flex items-start gap-3">
            <Avatar src={request.avatar_url} name={request.name} size={44} />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold tracking-tight">
                {request.name}
              </h3>
              <p className={HINT}>
                {request.year} · {EXPERIENCE_LABELS[request.experience_level]}
              </p>
            </div>
          </div>

          {/* The same reason line the match card shows, for the same purpose:
              it says the two of you arrived here by posting the same thing. */}
          {shared.length > 0 ? (
            <div className="mt-3.5 flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5">
              <svg
                aria-hidden
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="mt-0.5 shrink-0 text-muted-foreground"
              >
                <circle cx="9" cy="12" r="6" />
                <circle cx="15" cy="12" r="6" />
              </svg>
              <p className="text-sm">
                You both train{" "}
                <span className="font-semibold">{describeSharedDays(shared)}</span>
                {overlap ? (
                  <>
                    , and you&rsquo;re both free{" "}
                    <span className="font-semibold">
                      {toHHMM(overlap.start)} – {toHHMM(overlap.end)}
                    </span>
                  </>
                ) : null}
                .
              </p>
            </div>
          ) : null}

          {request.tags && request.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {request.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}

          {/* F4.3: "intent details" — what they are actually proposing. */}
          <p className="mt-3 text-sm">
            {ACTIVITY_LABELS[request.activity]} · {request.days.join(", ")} ·{" "}
            {formatTimeRange(request.time_start, request.time_end)}
          </p>

          <form action={formAction} className="mt-4 space-y-2">
            <input type="hidden" name="request_id" value={request.request_id} />
            <FormError message={state.error} />

            {/* Both are full-height targets now. Decline used to be a 14px
                text link beside a 48px button, which made the two choices look
                unequal when F4.4 offers them as a pair. It stays NEUTRAL
                rather than red: declining is silent and ordinary (F4.6), and
                red beside the green primary would read as a traffic light. */}
            <div className="flex items-center gap-2.5">
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
                className={`${BUTTON_NEUTRAL} disabled:opacity-50`}
              />
            </div>
          </form>

          <p className={`mt-2.5 ${HINT}`}>
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
