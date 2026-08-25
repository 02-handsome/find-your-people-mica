import { Avatar } from "@/components/Avatar";
import { CARD, HINT } from "@/components/ui";
import type { Connection } from "@/lib/requests";

/**
 * PRD F4.7 — an accepted connection, with the contact handle revealed.
 *
 * The handle is the entire point of the screen, so it is rendered large and as
 * a `tel:` link: on a phone that is one tap to call or to copy into WhatsApp,
 * which is where PRD Q4 acknowledges the relationship actually continues.
 */
export function ConnectionCard({ connection }: { connection: Connection }) {
  return (
    <li className={CARD}>
      <div className="flex items-start gap-3">
        <Avatar src={connection.avatar_url} name={connection.name} size={44} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold tracking-tight">
            {connection.name}
          </h3>
          <p className={HINT}>{connection.year}</p>
        </div>
      </div>

      {connection.tags && connection.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {connection.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs dark:border-neutral-800"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 rounded-lg bg-neutral-100 px-3 py-2.5 dark:bg-neutral-900">
        <p className={HINT}>Contact</p>
        <a
          href={`tel:${connection.contact_handle}`}
          className="mt-0.5 block font-mono text-lg font-medium tracking-tight"
        >
          {connection.contact_handle}
        </a>
      </div>
    </li>
  );
}
