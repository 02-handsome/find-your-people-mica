"use server";

import { redirect } from "next/navigation";

import { CAMPUS_ONLY_MESSAGE } from "@/lib/campus";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error: string | null;
  /**
   * The submitted email, echoed back so the form can re-fill it.
   *
   * React 19 resets uncontrolled fields once a form action completes, so
   * without this a wrong password would also clear the email address.
   *
   * The password is deliberately NOT echoed. Round-tripping it through
   * component state would put it in the client-side payload for no benefit —
   * retyping a password after a failed attempt is expected behaviour anyway.
   */
  email?: string;
};

const MIN_PASSWORD_LENGTH = 8;

/** PRD F1.1 + F1.2 — sign up, gated on campus email domain. */
export async function signUpAction(
  _previous: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are both required.", email };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      email,
    };
  }

  const supabase = await createClient();

  // F1.2. Asks the database, which owns the allowlist. This exists purely so we
  // can show the specified message — the trigger on auth.users is the actual
  // gate, and it runs whether or not this check does.
  const { data: allowed, error: checkError } = await supabase.rpc(
    "is_email_allowed",
    { email }
  );

  if (checkError) {
    return {
      error: "Could not verify your email domain. Please try again.",
      email,
    };
  }
  if (!allowed) {
    return { error: CAMPUS_ONLY_MESSAGE, email };
  }

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    // If the pre-check above was raced or bypassed, the trigger still fires and
    // this is where its rejection arrives. Measured behaviour (not assumed):
    // Supabase returned `23514 CAMPUS_DOMAIN_NOT_ALLOWED: <email>` verbatim
    // rather than flattening it to "Database error saving new user" as its docs
    // suggest. Both spellings are matched, because relying on either alone
    // would leak a raw Postgres error into the UI if the behaviour changed.
    if (/CAMPUS_DOMAIN_NOT_ALLOWED|database error/i.test(error.message)) {
      return { error: CAMPUS_ONLY_MESSAGE, email };
    }
    if (/already registered|already been registered/i.test(error.message)) {
      return {
        error: "That email already has an account. Try logging in.",
        email,
      };
    }
    return { error: error.message, email };
  }

  // Email confirmation is disabled (docs/notes.md AD-4), so signUp returns a
  // session and the user is signed in here. Profile is still empty: F1.3.
  redirect("/profile-setup");
}

/** PRD F1.5 — log in. */
export async function signInAction(
  _previous: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are both required.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // One message for both "no such account" and "wrong password", on purpose:
    // distinguishing them tells an attacker which addresses are registered.
    return { error: "That email and password don't match an account.", email };
  }

  redirect("/");
}
