import { redirect } from "next/navigation";

import { getUserId } from "@/lib/auth";

/**
 * Public routes. The only guard here is the inverse of F1.6: someone already
 * signed in has no use for the login screen, so send them home.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await getUserId()) redirect("/");

  return (
    // The backdrop is full-bleed and the column stays max-w-sm inside it.
    // Putting the pattern on <main> would paint a 384px stripe down the middle
    // of a desktop window instead of a background.
    <div className="auth-backdrop min-h-dvh w-full">
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-7 px-6 py-12">
        {children}
      </main>
    </div>
  );
}
