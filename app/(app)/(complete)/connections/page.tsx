import type { Metadata } from "next";
import Link from "next/link";

import { ConnectionCard } from "@/components/ConnectionCard";
import { CARD, HINT } from "@/components/ui";
import { getConnections } from "@/lib/requests-server";

export const metadata: Metadata = { title: "Connections · Find Your People" };

/** Screen 6 (PRD section 7) — accepted matches with revealed contact handles. */
export default async function ConnectionsPage() {
  const connections = await getConnections();

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
        <p className={`mt-2 ${HINT}`}>
          People you both said yes to. Their contact is here because they have
          yours.
        </p>
      </header>

      {connections.length === 0 ? (
        /* CLAUDE.md: never a blank screen. Explains the mechanism rather than
           reporting an absence — "none yet" alone reads like something broke. */
        <section className={`mt-8 ${CARD}`}>
          <h2 className="text-base font-medium">No connections yet</h2>
          <p className={`mt-1 ${HINT}`}>
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
          className="text-sm font-medium underline text-neutral-600 dark:text-neutral-400"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
