import { cache } from "react";

import type { Connection, IncomingRequest } from "@/lib/requests";
import { createClient } from "@/lib/supabase/server";

/**
 * Both of these separate `failed` from "empty", the way matches-server.ts
 * already did.
 *
 * Until Phase 7 they returned `[]` on error, which meant a broken query
 * rendered "No connections yet" — a confident statement about the world, made
 * on no information. The matches version got this right and its own comment
 * explained why; these two were written without that care. An empty array and a
 * failed request are indistinguishable at the call site unless the distinction
 * is carried explicitly, so it is.
 */
export type IncomingRequestsResult = {
  requests: IncomingRequest[];
  failed: boolean;
};

export type ConnectionsResult = {
  connections: Connection[];
  failed: boolean;
};

/** F4.3 — pending requests addressed to the caller. */
export const getIncomingRequests = cache(async (): Promise<IncomingRequestsResult> => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_incoming_requests");
  if (error) {
    console.error("get_incoming_requests failed:", error.message);
    return { requests: [], failed: true };
  }

  return { requests: (data ?? []) as IncomingRequest[], failed: false };
});

/**
 * F4.5 / F4.7 — accepted connections, with contact handles.
 *
 * The only call in the application that can return someone else's
 * contact_handle, and only for pairs with an accepted request — enforced by the
 * shape of get_connections(), not by anything here. Nothing in this file
 * filters, because there is nothing left to filter.
 */
export const getConnections = cache(async (): Promise<ConnectionsResult> => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_connections");
  if (error) {
    console.error("get_connections failed:", error.message);
    return { connections: [], failed: true };
  }

  return { connections: (data ?? []) as Connection[], failed: false };
});
