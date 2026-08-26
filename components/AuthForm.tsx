"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";

import type { AuthFormState } from "@/app/(auth)/actions";
import { FormError } from "@/components/FormError";
import { SubmitButton } from "@/components/SubmitButton";
import { HINT, INPUT, LABEL } from "@/components/ui";

/**
 * Shared by login and signup — the two forms differ only in their action and
 * their labels, so they share one component rather than drifting apart.
 *
 * Uses a form action rather than an onSubmit handler, so it still submits if
 * client JS hasn't loaded. The password reveal is the one thing here that
 * needs JS, and it degrades to a normal password field without it.
 */
export function AuthForm({
  action,
  submitLabel,
  pendingLabel,
  autoCompletePassword,
  passwordHint,
  footer,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  submitLabel: string;
  pendingLabel: string;
  autoCompletePassword: "current-password" | "new-password";
  passwordHint?: string;
  /** Rendered between the fields and the submit button. */
  footer?: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, { error: null });
  const [revealed, setRevealed] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormError message={state.error} />

      <div>
        <label className={LABEL} htmlFor="email">
          University email
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
          // Re-filled after a failed submit; React 19 resets uncontrolled
          // fields once the action completes.
          defaultValue={state.email ?? ""}
          placeholder="you@micamail.in"
          className={INPUT}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="password">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={revealed ? "text" : "password"}
            required
            autoComplete={autoCompletePassword}
            className={`${INPUT} pr-12`}
          />
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            // The label states the ACTION, and it changes with the state —
            // unlike the theme toggle, this control knows which state it is in
            // at render time, so it can say so.
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground transition-colors hover:text-foreground"
          >
            {revealed ? (
              <EyeOff aria-hidden className="size-5" strokeWidth={1.75} />
            ) : (
              <Eye aria-hidden className="size-5" strokeWidth={1.75} />
            )}
          </button>
        </div>
        {passwordHint ? (
          <p className={`mt-1.5 ${HINT}`}>{passwordHint}</p>
        ) : null}
      </div>

      {footer}

      <div className="mt-1">
        <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
