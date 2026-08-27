import { CircleCheck, Phone } from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { BUTTON_PRIMARY_LINK, CARD, CHIP, HINT } from "@/components/ui";
import type { Connection } from "@/lib/requests";

/**
 * PRD F4.7 — an accepted connection, with the contact handle revealed.
 *
 * Stitch's card: avatar row with a MATCHED pill, a rule, then the channel and
 * the action. Two departures, both deliberate.
 *
 * FIRST — their handle is 14px body text beside a prominent "Message" button.
 * This is the one screen the whole product exists to reach, and F4.5 is the
 * only moment it delivers anything, so the number stays large. It is 24px in
 * the accent.
 *
 * That it can BE the accent is the point. The previous palette made
 * --color-accent and --color-text-primary the same hex, so a number "in the
 * accent colour" was invisible and the block had to invert to get any contrast
 * at all (AD-28). Against a red that nothing else in the palette resembles,
 * inversion is no longer buying anything, so it is gone. The workaround
 * outlived the problem.
 *
 * SECOND — their button says "Message" with a send glyph. This app has no
 * messaging; in-app chat is the first item on the PRD's non-goals. What
 * `contact_handle` actually guarantees is a phone number — it is validated as
 * an Indian mobile — so the button is Call, and it does the one thing the data
 * supports. WhatsApp is where PRD Q4 expects the conversation to continue, but
 * nothing in the schema says this number is on WhatsApp, so the app does not
 * claim it is.
 *
 * The per-card "You both said yes" line is gone: the MATCHED pill says it, and
 * so does the page description above the list.
 */
export function ConnectionCard({ connection }: { connection: Connection }) {
  const connectedOn = new Date(connection.connected_at).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "short" }
  );

  return (
    <li>
      <article className={CARD}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              src={connection.avatar_url}
              name={connection.name}
              size={48}
            />
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold tracking-tight">
                {connection.name}
              </h3>
              {/* connected_at has come back from get_connections() since Phase 6
                  and was rendered nowhere until now. */}
              <p className={`truncate ${HINT}`}>
                {connection.year} · Connected {connectedOn}
              </p>
            </div>
          </div>

          <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-primary-foreground">
            <CircleCheck aria-hidden className="size-3.5" strokeWidth={2.25} />
            <span className="label-caps text-[10px]">Matched</span>
          </span>
        </div>

        {connection.tags && connection.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {connection.tags.map((tag) => (
              <span key={tag} className={CHIP}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <hr className="my-4 border-border" />

        {/* The reveal. Fades and scales in over 300ms — a CSS keyframe, not a
            hook, so this stays a Server Component and ships no JavaScript for
            it, and it honours prefers-reduced-motion. */}
        <div className="animate-reveal">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-notice text-notice-foreground">
              <Phone aria-hidden className="size-5" strokeWidth={1.75} />
            </span>
            <p className="min-w-0 truncate font-mono text-2xl font-semibold tracking-tight text-primary">
              {connection.contact_handle}
            </p>
          </div>

          <a
            href={`tel:${connection.contact_handle}`}
            className={`mt-4 ${BUTTON_PRIMARY_LINK}`}
          >
            <Phone aria-hidden className="size-5" strokeWidth={2} />
            Call
          </a>
        </div>
      </article>
    </li>
  );
}
