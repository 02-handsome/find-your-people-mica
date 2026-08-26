import type { Metadata } from "next";

import { signUpAction } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/AuthForm";
import { AuthTabs } from "@/components/AuthTabs";
import { CampusNotice } from "@/components/CampusNotice";
import { CARD, HINT } from "@/components/ui";
import { getAllowedEmailDomains } from "@/lib/campus-server";

export const metadata: Metadata = { title: "Sign up · Find Your People" };

/** Screen 1 (PRD section 7), signup half. F1.1 + F1.2. */
export default async function SignUpPage() {
  const domains = await getAllowedEmailDomains();

  return (
    <>
      <header className="text-center">
        <h1 className="text-[28px] leading-[34px] font-bold tracking-[-0.02em] text-primary">
          Find Your People
        </h1>
        <p className={`mx-auto mt-2 max-w-[280px] ${HINT}`}>
          Connect with students who share your interests and schedule.
        </p>
      </header>

      {/* Stated up front rather than only as a rejection, so nobody types a
          gmail address and gets bounced. */}
      <CampusNotice domains={domains} />

      <AuthTabs active="signup" />

      <div className={CARD}>
        <AuthForm
          action={signUpAction}
          submitLabel="Create Account"
          pendingLabel="Creating account…"
          autoCompletePassword="new-password"
          passwordHint="Must be at least 8 characters."
        />
      </div>
    </>
  );
}
