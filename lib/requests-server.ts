import { cache } from "react";

import type { Connection, IncomingRequest } from "@/lib/requests";
import { createClient } from "@/lib/supabase/server";

/** F4.3 — pending requests addressed to the caller. */
export const getIncomingRequests = cache(async (): Promise<IncomingRequest[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_incoming_requests");
  if (error) {
    console.error("get_incoming_requests failed:", error.message);
    return [];
  }

  return (data ?? []) as IncomingRequest[];
});

/**
 * F4.5 / F4.7 — accepted connections, with contact handles.
 *
 * This is the only call in the application that can return someone else's
 * contact_handle, and it can only do so for pairs with an accepted request —
 * enforced by the shape of get_connections(), not by anything here. Nothing in
 * this file filters; there is nothing left to filter.
 */
export const getConnections = cache(async (): Promise<Connection[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_connections");
  if (error) {
    console.error("get_connections failed:", error.message);
    return [];
  }

  return (data ?? []) as Connection[];
});
