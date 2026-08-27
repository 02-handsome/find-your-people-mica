import type { Metadata } from "next";

import { signInAction } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/AuthForm";
import { AuthTabs } from "@/components/AuthTabs";
import { BrandMark } from "@/components/BrandMark";
import { CampusNotice } from "@/components/CampusNotice";
import { CARD, HINT } from "@/components/ui";
import { getAllowedEmailDomains } from "@/lib/campus-server";
import { TEST_ACCOUNTS } from "@/lib/test-accounts";

export const metadata: Metadata = { title: "Log in · Find Your People" };

/** Screen 1 (PRD section 7): email, password, campus notice, test credentials. */
export default async function LoginPage() {
  const domains = await getAllowedEmailDomains();

  return (
    <>
      <header className="text-center">
        <BrandMark />

        {/* The product name lives here. F1.6 makes "/" private, so this is the
            first screen anyone sees — it carries the branding that was on the
            Phase 1 homepage. See docs/notes.md AD-7.

            Stitch puts the collage mark above the wordmark. */}
        <h1 className="mt-6 text-[28px] leading-[34px] font-bold tracking-[-0.02em] text-primary">
          Find Your People
        </h1>
        <p className={`mx-auto mt-2 max-w-[280px] ${HINT}`}>
          Connect with students who share your interests and schedule.
        </p>
      </header>

      <CampusNotice domains={domains} />

      <AuthTabs active="login" />

      <div className={CARD}>
        <AuthForm
          action={signInAction}
          submitLabel="Log In"
          pendingLabel="Logging in…"
          autoCompletePassword="current-password"
          footer={
            /* PRD S5: credentials visible on the login screen so a grader
               needs no setup. Intentionally public — see lib/test-accounts.ts.
               Stitch places this inside the form card, directly above the
               submit button, which is also where it is most useful. */
            <section className="mt-1 rounded-lg border border-border bg-secondary p-3 text-center">
              <h2 className="label-caps text-muted-foreground">
                Test credentials
              </h2>
              <ul className="mt-1.5 space-y-1">
                {TEST_ACCOUNTS.map((account) => (
                  <li
                    key={account.email}
                    className="font-mono text-xs break-all text-muted-foreground"
                  >
                    {account.email} / {account.password}
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-xs leading-4 text-muted-foreground">
                {/* The direction is not a detail. Sending from test.one is
                    refused — F3.3 returns the top 3 and test.two does not make
                    test.one's, so F4.1 correctly rejects it. Without this line
                    that reads as a broken Connect button. */}
                <strong className="font-semibold text-foreground">
                  Start from test.two.
                </strong>{" "}
                Send the request there, then log in as test.one to accept.
                Matching shows only your top 3, so it isn&rsquo;t symmetric.
              </p>
            </section>
          }
        />
      </div>
    </>
  );
}
