import type { Day } from "@/lib/intents";

/**
 * What the viewer posted — enough to work out an overlap, and nothing more.
 *
 * Lives here rather than in a component because three screens need it and a
 * type should not be imported from whichever card happened to declare it
 * first.
 */
export type ViewerWindow = {
  days: Day[];
  time_start: string;
  time_end: string;
};
