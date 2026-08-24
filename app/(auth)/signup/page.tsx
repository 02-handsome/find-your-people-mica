import type { Metadata } from "next";
import Link from "next/link";

import { signUpAction } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/AuthForm";
import { HINT } from "@/components/ui";
import { CAMPUS_NAME } from "@/lib/campus";
import { getAllowedEmailDomains } from "@/lib/campus-server";

export const metadata: Metadata = { title: "Sign up · Find Your People" };

/** Screen 1 (PRD section 7), signup half. F1.1 + F1.2. */
export default async function SignUpPage() {
  const domains = await getAllowedEmailDomains();

  return (
    <>
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className={`mt-2 ${HINT}`}>
          {/* Stated up front rather than only as a rejection, so nobody types a
              gmail address and gets bounced. */}
          {CAMPUS_NAME} students only
          {domains.length > 0
            ? `. Use your ${domains.map((d) => `@${d}`).join(" or ")} address.`
            : "."}
        </p>
      </header>

      <AuthForm
        action={signUpAction}
        submitLabel="Create account"
        pendingLabel="Creating account…"
        autoCompletePassword="new-password"
        passwordHint="At least 8 characters."
      />

      <p className="text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="font-medium underline">
          Log in
        </Link>
      </p>
    </>
  );
}
