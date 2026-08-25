import type { Metadata } from "next";
import Link from "next/link";

import { signInAction } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/AuthForm";
import { CARD, HINT } from "@/components/ui";
import { CAMPUS_NAME } from "@/lib/campus";
import { getAllowedEmailDomains } from "@/lib/campus-server";
import { TEST_ACCOUNTS } from "@/lib/test-accounts";

export const metadata: Metadata = { title: "Log in · Find Your People" };

/** Screen 1 (PRD section 7): email, password, campus notice, test credentials. */
export default async function LoginPage() {
  const domains = await getAllowedEmailDomains();

  return (
    <>
      <header className="text-center">
        {/* The product name lives here now. F1.6 makes "/" private, so this is
            the first screen anyone sees — it has to carry the branding that
            was on the Phase 1 homepage. See docs/notes.md AD-7. */}
        <h1 className="text-3xl font-semibold tracking-tight">
          Find Your People
        </h1>
        <p className={`mt-2 ${HINT}`}>
          Post what you want a partner for. Get matched with people who posted
          the same thing.
        </p>
      </header>

      <AuthForm
        action={signInAction}
        submitLabel="Log in"
        pendingLabel="Logging in…"
        autoCompletePassword="current-password"
      />

      <p className="text-center text-sm">
        New here?{" "}
        <Link href="/signup" className="font-medium underline">
          Create an account
        </Link>
      </p>

      <p className={`text-center ${HINT}`}>
        {/* Rendered from the database allowlist, so it cannot contradict what
            signup actually accepts. */}
        Open to {CAMPUS_NAME} only
        {domains.length > 0
          ? ` — ${domains.map((d) => `@${d}`).join(" or ")}`
          : ""}
        .
      </p>

      {/* PRD S5: credentials visible on the login screen so a grader needs no
          setup. Intentionally public — see lib/test-accounts.ts. */}
      <section className={CARD}>
        <h2 className="text-sm font-medium">Test accounts</h2>
        <p className={`mt-1 ${HINT}`}>For grading — log in with either.</p>
        <ul className="mt-3 space-y-1.5">
          {TEST_ACCOUNTS.map((account) => (
            <li
              key={account.email}
              className="font-mono text-xs break-all text-neutral-600 dark:text-neutral-400"
            >
              {account.email} · {account.password}
            </li>
          ))}
        </ul>
        <p className={`mt-3 ${HINT}`}>
          {/* The direction is not a detail. Sending from test.one is refused —
              F3.3 returns the top 3 and test.two does not make test.one's,
              so F4.1 correctly rejects it. Without this line that reads as a
              broken Connect button. See lib/test-accounts.ts. */}
          <strong className="font-medium text-neutral-700 dark:text-neutral-300">
            Start from test.two.
          </strong>{" "}
          Send the request from there, then log in as test.one to accept — the
          whole request → accept → reveal loop, no signup needed. Matching shows
          only your top 3, so it isn&rsquo;t symmetric: going the other way will
          say they aren&rsquo;t in your matches.
        </p>
      </section>
    </>
  );
}
