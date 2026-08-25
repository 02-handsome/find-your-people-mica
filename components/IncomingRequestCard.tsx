import {
  acceptRequestAction,
  declineRequestAction,
} from "@/app/(app)/(complete)/requests/actions";
import { Avatar } from "@/components/Avatar";
import { BUTTON_PRIMARY, CARD, HINT } from "@/components/ui";
import {
  ACTIVITY_LABELS,
  EXPERIENCE_LABELS,
  formatTimeRange,
} from "@/lib/intents";
import type { IncomingRequest } from "@/lib/requests";

/**
 * PRD F4.3 / F4.4 — an incoming request on the recipient's home screen.
 *
 * Shows the sender's name, avatar, tags and intent details, and nothing else.
 * There is no contact_handle here because get_incoming_requests() cannot return
 * one: deciding whether to accept must not require already having what
 * accepting grants.
 */
export function IncomingRequestCard({ request }: { request: IncomingRequest }) {
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
        {request.days.join(", ")} · {formatTimeRange(request.time_start, request.time_end)}
      </p>

      <div className="mt-4 flex items-center gap-3">
        <form action={acceptRequestAction} className="flex-1">
          <input type="hidden" name="request_id" value={request.request_id} />
          <button type="submit" className={BUTTON_PRIMARY}>
            Accept
          </button>
        </form>

        <form action={declineRequestAction}>
          <input type="hidden" name="request_id" value={request.request_id} />
          <button
            type="submit"
            className="px-2 text-sm font-medium underline text-neutral-600 dark:text-neutral-400"
          >
            Decline
          </button>
        </form>
      </div>

      <p className={`mt-2.5 ${HINT}`}>
        {/* Says exactly what Accept does, at the moment of the decision. This is
            the one irreversible action in the product: F4.5 reveals both
            handles and AD-16 makes accepted terminal. */}
        Accepting shares your contact handle with them, and theirs with you.
      </p>
    </li>
  );
}
