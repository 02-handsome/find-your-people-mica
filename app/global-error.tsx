"use client";

/**
 * Errors thrown in the ROOT LAYOUT, which app/error.tsx cannot catch — at that
 * point there is no layout left to render inside.
 *
 * The case this actually exists for: `lib/env.ts` throws at module load when a
 * NEXT_PUBLIC_SUPABASE_* variable is missing. That is the single most likely
 * production failure on a fresh Vercel deploy — someone forgets to add an
 * environment variable, or edits one and does not redeploy. Without this file
 * the result is an unbranded 500 with no hint about the cause.
 *
 * Must render its own <html> and <body>: the root layout is what failed, so
 * nothing else is providing them. That also means no Tailwind classes can be
 * relied on here, hence the inline styles.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: "#ffffff",
          color: "#171717",
        }}
      >
        <div style={{ maxWidth: "24rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
            Find Your People is temporarily unavailable
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "#737373" }}>
            The app could not start. This is a configuration problem on our side,
            not anything you did.
          </p>
          <p style={{ marginTop: "1.25rem", fontSize: "0.875rem" }}>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages --
                A plain <a> is correct here, not next/link. This boundary renders
                because the ROOT LAYOUT failed, so a client-side soft navigation
                would re-mount the same broken tree and fail again. A full page
                reload is the only thing that can actually recover — which is
                exactly what an <a> does and Link avoids. */}
            <a href="/" style={{ color: "#171717" }}>
              Try again
            </a>
          </p>
          {error.digest ? (
            <p
              style={{
                marginTop: "1.5rem",
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.75rem",
                color: "#a3a3a3",
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
