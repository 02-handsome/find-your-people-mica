import { Phone } from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { HINT } from "@/components/ui";
import type { Connection } from "@/lib/requests";

/**
 * PRD F4.7 — an accepted connection, with the contact handle revealed.
 *
 * This is the one screen the whole product exists to reach, and it used to
 * report the fact the way it would report any other field: an 18px number in a
 * grey box. So the block is INVERTED — a solid accent fill with the number
 * reversed out of it — and it fades and scales in over 300ms.
 *
 * Inversion rather than a coloured number, for a specific reason: in Astryx
 * matcha `--color-accent` and `--color-text-primary` are the same hex
 * (#3E481D). A number "in the accent colour" would therefore be the same
 * colour as every other word on the screen, only larger. Inverting is the only
 * move that buys real contrast out of this palette — and it is the same
 * mechanic the activity picker uses to say "this one is selected", so the app
 * has a single way of saying *this is the important thing*. docs/notes.md AD-28.
 *
 * The animation is a CSS keyframe, not a hook, so this stays a Server
 * Component and ships no JavaScript. It honours prefers-reduced-motion.
 */
export function ConnectionCard({ connection }: { connection: Connection }) {
  const connectedOn = new Date(connection.connected_at).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "short" }
  );

  return (
    <li>
      <Card>
        <CardContent>
          <div className="flex items-start gap-3">
            <Avatar
              src={connection.avatar_url}
              name={connection.name}
              size={44}
            />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold tracking-tight">
                {connection.name}
              </h3>
              <p className={HINT}>{connection.year}</p>
            </div>
            {/* connected_at has come back from get_connections() since Phase 6
                and was rendered nowhere. */}
            <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
              {connectedOn}
            </span>
          </div>

          {connection.tags && connection.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {connection.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="animate-reveal mt-4 rounded-lg bg-primary px-4 py-3.5">
            {/* One line of acknowledgement. It names what happened rather than
                labelling a field — "Contact" is a form label, and this is not
                a form. */}
            <p className="text-xs font-medium text-background/75">
              You both said yes. Here&rsquo;s how to reach them.
            </p>
            <a
              href={`tel:${connection.contact_handle}`}
              className="mt-1.5 flex items-center justify-between gap-3 text-background"
            >
              <span className="font-mono text-2xl font-medium tracking-tight">
                {connection.contact_handle}
              </span>
              <Phone
                aria-hidden
                className="size-5 shrink-0"
                strokeWidth={1.75}
              />
            </a>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
