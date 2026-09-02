import type { Day } from "@/lib/intents";

/**
 * What the viewer posted — enough to work out an overlap, and nothing more.
 *
 * Lives here rather than in a component because three screens need it and a
 * type should not be imported from whichever card happened to declare it
 * first.
 *
 * Deliberately still just the window. Tags were nearly added to it when the
 * shared-interest marking went in, and that would have been wrong: this object
 * comes from `intents` and is NULL for someone who has withdrawn theirs, while
 * tags come from `users` and are always there. Merging them would have stopped
 * marking shared interests on incoming requests in exactly the case where the
 * recipient has no live intent — which is a state they can still receive and
 * answer requests in. Viewer tags travel as their own prop.
 */
export type ViewerWindow = {
  days: Day[];
  time_start: string;
  time_end: string;
};

/** One of the other person's tags, and whether the viewer picked it too. */
export type TagMatch = { tag: string; shared: boolean };

/**
 * The other person's tags, marked and reordered so the shared ones lead.
 *
 * WHY THIS EXISTS AT ALL. F3's score is
 *
 *   (shared_days x 3) + (level match ? 2 : 0) + (overlapping_tags x 2)
 *   + (time_overlap_minutes / 30)
 *
 * and the cards already drew two of those four terms as MUTUAL facts — the
 * "you both train" row, and the filled day circles. Tags were drawn as a flat
 * list of facts about a stranger, with nothing marking which ones counted.
 *
 * That is the term that matters most on the matches screen. `activity` is a
 * hard filter (F3.1) and the time window is a hard filter (F3.2), so every
 * candidate you are shown already shares your activity and your hours. Tags
 * are what actually differs between them — lib/profile-options.ts says so in
 * as many words: "what separates two equally available gym partners". Leaving
 * them unmarked hid the one signal the ranking was really using.
 *
 * It does NOT contradict AD-9. Tags still never filter, and nothing here says
 * they did — a shared tag is reported after the fact, as a reason this person
 * sorted where they did. The profile form's line still stands.
 *
 * Costs no query: both sides are already on the page.
 *
 * Shared-first rather than alphabetical because the chips wrap, and at 375px a
 * shared tag that lands on row two is a shared tag nobody reads.
 */
export function compareTags(
  viewerTags: string[] | null,
  otherTags: string[] | null
): TagMatch[] {
  const mine = new Set(viewerTags ?? []);
  const marked = (otherTags ?? []).map((tag) => ({
    tag,
    shared: mine.has(tag),
  }));

  // Two passes rather than a sort comparator: it keeps each group in the order
  // the other person chose their tags in, and reads as what it is.
  return [
    ...marked.filter((t) => t.shared),
    ...marked.filter((t) => !t.shared),
  ];
}
