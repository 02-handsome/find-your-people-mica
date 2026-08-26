import type { Metadata } from "next";
import { Handshake, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { ConnectionCard } from "@/components/ConnectionCard";
import { CARD, HINT } from "@/components/ui";
import { getConnections } from "@/lib/requests-server";

export const metadata: Metadata = { title: "Connections · Find Your People" };

/** Screen 6 (PRD section 7) — accepted matches with revealed contact handles. */
export default async function ConnectionsPage() {
  const { connections, failed } = await getConnections();

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
        <p className={`mt-2 ${HINT}`}>
          People you both said yes to. Their contact is here because they have
          yours.
        </p>
      </header>

      {failed ? (
        /* Distinct from "none yet" on purpose. Telling someone they have no
           connections when the query broke is a claim about their life made on
           no information — and here it is the worst possible claim, because the
           screen exists to hold contact details they were promised. */
        <section className={`mt-8 ${CARD} text-center`}>
          <TriangleAlert
            aria-hidden
            className="mx-auto size-7 text-muted-foreground"
            strokeWidth={1.5}
          />
          <h2 className="mt-4 text-base font-medium">
            Couldn&rsquo;t load your connections
          </h2>
          <p className={`mt-1 ${HINT}`}>
            Something went wrong on our side. Nothing has been lost — any
            connections you&rsquo;ve made are still there.
          </p>
        </section>
      ) : connections.length === 0 ? (
        /* CLAUDE.md: never a blank screen. Explains the mechanism rather than
           reporting an absence — "none yet" alone reads like something broke. */
        <section className={`mt-8 ${CARD} px-6 py-10 text-center`}>
          <Handshake
            aria-hidden
            className="mx-auto size-8 text-muted-foreground"
            strokeWidth={1.5}
          />
          <h2 className="mt-5 text-base font-medium">No connections yet</h2>
          <p className={`mt-2 ${HINT}`}>
            When you send someone a request and they accept, you&rsquo;ll both
            see each other&rsquo;s contact here.
          </p>
          <Link
            href="/matches"
            className="mt-4 inline-block text-sm font-medium underline"
          >
            See your matches
          </Link>
        </section>
      ) : (
        <ul className="mt-8 space-y-4">
          {connections.map((connection) => (
            <ConnectionCard key={connection.request_id} connection={connection} />
          ))}
        </ul>
      )}

      <div className="mt-8">
        <Link
          href="/"
          className="inline-block py-3 text-sm font-medium underline text-muted-foreground"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
