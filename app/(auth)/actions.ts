"use server";

import { redirect } from "next/navigation";

import { CAMPUS_ONLY_MESSAGE } from "@/lib/campus";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = { error: string | null };

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
    return { error: "Email and password are both required." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
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
    return { error: "Could not verify your email domain. Please try again." };
  }
  if (!allowed) {
    return { error: CAMPUS_ONLY_MESSAGE };
  }

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    // Supabase Auth flattens a trigger exception into an opaque "Database error
    // saving new user". If the pre-check above was somehow bypassed or raced,
    // that is what a domain rejection looks like coming back — so translate it
    // rather than showing the raw text.
    if (/database error/i.test(error.message)) {
      return { error: CAMPUS_ONLY_MESSAGE };
    }
    if (/already registered|already been registered/i.test(error.message)) {
      return { error: "That email already has an account. Try logging in." };
    }
    return { error: error.message };
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
    return { error: "Email and password are both required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // One message for both "no such account" and "wrong password", on purpose:
    // distinguishing them tells an attacker which addresses are registered.
    return { error: "That email and password don't match an account." };
  }

  redirect("/");
}
