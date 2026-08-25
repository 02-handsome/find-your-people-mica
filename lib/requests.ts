import type { Activity, Day, ExperienceLevel } from "@/lib/intents";

/**
 * One row from public.get_incoming_requests() — F4.3.
 *
 * Mirrors that function's RETURNS TABLE, which has no `contact_handle`. That
 * omission is deliberate and load-bearing: someone deciding whether to accept
 * must not already hold the thing accepting is supposed to grant (F4.5).
 */
export type IncomingRequest = {
  request_id: string;
  from_user_id: string;
  name: string | null;
  year: string | null;
  tags: string[] | null;
  avatar_url: string | null;
  activity: Activity;
  days: Day[];
  time_start: string;
  time_end: string;
  experience_level: ExperienceLevel;
  requested_at: string;
};

/**
 * One row from public.get_connections() — F4.5 / F4.7.
 *
 * The only type in this codebase that carries a contact_handle belonging to
 * someone other than the signed-in user. It can only be produced by a function
 * whose query is driven from an accepted request.
 */
export type Connection = {
  request_id: string;
  other_user_id: string;
  name: string | null;
  year: string | null;
  tags: string[] | null;
  avatar_url: string | null;
  contact_handle: string;
  connected_at: string;
};

/** F4.2 — what the card says once a request has gone out. */
export const REQUEST_SENT_LABEL = "Request sent";
