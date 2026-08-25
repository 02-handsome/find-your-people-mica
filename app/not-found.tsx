import Link from "next/link";

/**
 * 404. Without this, an unknown path renders Next.js's default page, which is
 * unstyled and says "This page could not be found" over a bare white screen —
 * indistinguishable from the app being broken.
 *
 * Sends people to /login rather than / because F1.6 makes every other route
 * private: an unauthenticated visitor who mistypes a URL would otherwise be
 * bounced through a redirect to get to the same place.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-6 py-12 text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          That page doesn&rsquo;t exist
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          The link may be out of date, or the address slightly off.
        </p>
      </div>

      <Link
        href="/login"
        className="w-full rounded-lg bg-neutral-900 px-4 py-3 text-base font-medium text-white inline-block text-center dark:bg-neutral-100 dark:text-neutral-900"
      >
        Go to Find Your People
      </Link>
    </main>
  );
}
