import { Check } from "lucide-react";

import { CHIP, CHIP_SHARED } from "@/components/ui";
import { compareTags } from "@/lib/overlap";

/**
 * The other person's interests, with the ones you also picked marked.
 *
 * Shared by the match card and the incoming-request card for the same reason
 * OverlapLine is: two copies of this JSX would be two places that can disagree
 * about what "shared" looks like, and this project has paid for that three
 * times already (AD-5, AD-10, AD-20).
 *
 * NOT used on the connections card. There the decision is already made and you
 * have their number — a "you both like Coffee" badge next to a phone number is
 * decoration, and it would put accent colour on a card whose one accent job is
 * the revealed handle.
 *
 * No "use client": it has no state and no server-only imports, so it renders
 * inside the Server Component match card AND inside the client-side request
 * card without either needing to change.
 */
export function TagRow({
  viewerTags,
  tags,
  className = "",
}: {
  /**
   * The signed-in user's own tags, from their profile. Present whether or not
   * they currently have an intent posted — that is the whole point of it not
   * riding along on ViewerWindow.
   */
  viewerTags: string[] | null;
  /** The other person's tags, as returned by the SQL function. */
  tags: string[] | null;
  className?: string;
}) {
  const marked = compareTags(viewerTags, tags);
  if (marked.length === 0) return null;

  const sharedCount = marked.filter((t) => t.shared).length;

  return (
    // The count goes on the LIST, not in a hidden first item: a hidden <li>
    // would make every screen reader announce "list, 4 items" over 3 chips.
    <ul
      aria-label={
        sharedCount > 0
          ? `Their interests — ${sharedCount} also ${
              sharedCount === 1 ? "one of yours" : "yours"
            }, listed first`
          : "Their interests"
      }
      className={`flex flex-wrap gap-2 ${className}`}
    >
      {marked.map(({ tag, shared }) => (
        <li key={tag}>
          <span className={shared ? CHIP_SHARED : CHIP}>
            {/* Repeated per chip rather than left to the list label, because
                list names are not announced in every mode — and this is the
                cue a red-blind reader is relying on. */}
            {shared ? (
              <Check aria-hidden className="size-3 shrink-0" strokeWidth={3} />
            ) : null}
            {tag}
            {shared ? <span className="sr-only"> (also yours)</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
