export default function Home() {
  return (
    // min-h-dvh, not min-h-screen: on mobile browsers `100vh` sits behind the
    // address bar, which clips centred content. CLAUDE.md says design at 375px
    // first, so the mobile viewport unit is the correct default here.
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Find Your People
      </h1>
      <p className="mt-4 max-w-xs text-sm text-neutral-500 sm:max-w-sm sm:text-base">
        A verified campus app for finding someone to train with.
      </p>
    </main>
  );
}
