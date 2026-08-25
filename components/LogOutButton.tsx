"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signOutAction } from "@/app/(app)/actions";
import { FormError } from "@/components/FormError";

function Button() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm font-medium underline text-neutral-600 disabled:opacity-50 dark:text-neutral-400"
    >
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}

/**
 * PRD F1.5 — log out.
 *
 * A Client Component only so a failure can be reported. If signOut fails the
 * cookie survives, the redirect to /login bounces off (auth)/layout, and the
 * user lands back on home still logged in — having tapped "Log out" and been
 * told nothing. Rare, but silent-wrong is the category this phase is for.
 */
export function LogOutButton() {
  const [state, formAction] = useActionState(signOutAction, { error: null });

  return (
    <div>
      <form action={formAction}>
        <Button />
      </form>
      {state.error ? (
        <div className="mt-2">
          <FormError message={state.error} />
        </div>
      ) : null}
    </div>
  );
}
