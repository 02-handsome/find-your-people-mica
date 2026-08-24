"use client";

import { useActionState } from "react";

import type { AuthFormState } from "@/app/(auth)/actions";
import { FormError } from "@/components/FormError";
import { SubmitButton } from "@/components/SubmitButton";
import { HINT, INPUT, LABEL } from "@/components/ui";

/**
 * Shared by login and signup — the two forms differ only in their action and
 * their labels, so they share one component rather than drifting apart.
 *
 * Uses a form action rather than an onSubmit handler, so it still submits if
 * client JS hasn't loaded.
 */
export function AuthForm({
  action,
  submitLabel,
  pendingLabel,
  autoCompletePassword,
  passwordHint,
}: {
  action: (
    state: AuthFormState,
    formData: FormData
  ) => Promise<AuthFormState>;
  submitLabel: string;
  pendingLabel: string;
  autoCompletePassword: "current-password" | "new-password";
  passwordHint?: string;
}) {
  const [state, formAction] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />

      <div>
        <label className={LABEL} htmlFor="email">
          College email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          // Mobile keyboard hints: an email keypad, no auto-capitalisation and
          // no spellcheck squiggle under an address.
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@micamail.in"
          className={INPUT}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete={autoCompletePassword}
          className={INPUT}
        />
        {passwordHint ? (
          <p className={`mt-1.5 ${HINT}`}>{passwordHint}</p>
        ) : null}
      </div>

      <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
    </form>
  );
}
