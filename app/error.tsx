"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Recoverable render errors anywhere in the app.
 *
 * Without this file, a thrown error shows Next.js's own page: a stack trace in
 * development, and a bare unstyled "Application error: a client-side exception
 * has occurred" in production. Neither tells a student anything, and the second
 * looks like the app is gone.
 *
 * Deliberately does NOT print `error.message`. It can carry a Postgres error
 * code, a column name, or part of a query — none of which is useful to the
 * reader and some of which describes the schema. `digest` is Next's own hash of
 * the error, safe to show and enough to find the matching line in the Vercel
 * logs.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The real message goes to the server logs, not to the screen.
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-6 py-12 text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {/* Says what is and is not affected. A generic apology leaves people
              wondering whether their intent or their connections are lost. */}
          This one is on us, not you. Nothing you posted has been lost — your
          intent and connections are safe.
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={reset}
          className="w-full rounded-lg bg-primary px-4 py-3 text-base font-medium text-primary-foreground "
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-block text-sm font-medium underline text-muted-foreground"
        >
          Back to home
        </Link>
      </div>

      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      ) : null}
    </main>
  );
}
