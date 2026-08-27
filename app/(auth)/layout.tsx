import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/ThemeToggle";
import { getUserId } from "@/lib/auth";

/**
 * Public routes. The only guard here is the inverse of F1.6: someone already
 * signed in has no use for the login screen, so send them home.
 *
 * Stitch constrains the column to max-w-md with 20px side margins and a flat
 * background. The blob backdrop that used to live here is gone with the
 * matcha palette it belonged to — their login is deliberately plain, and a
 * gradient under a high-contrast red system fights it.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await getUserId()) redirect("/");

  return (
    <div className="relative min-h-dvh w-full bg-background">
      {/* Stitch has a settings gear in the app header and nothing here. The
          toggle goes top-right on both, so it is in the same place wherever
          you are. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex w-full max-w-md justify-end px-5 pt-5">
          <ThemeToggle className="pointer-events-auto" />
        </div>
      </div>

      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-16">
        {children}
      </main>
    </div>
  );
}
