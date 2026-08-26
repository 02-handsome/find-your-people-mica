import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";

import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

// The scaffold also loaded Geist Mono, but nothing uses a monospace face — it
// was a second webfont downloaded on every mobile visit for nothing. Add it back
// only if a design actually calls for it. (PRD N5: under 3s on mobile data.)
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Find Your People",
  description:
    "A verified campus app for finding a partner for recurring physical activity.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // This is the entire no-flash mechanism. The theme is on the request, so it
  // is in the HTML — there is no moment at which the document exists without
  // it, and therefore nothing to correct after paint.
  //
  // No cookie means "follow the OS": the attribute is omitted rather than
  // guessed, and prefers-color-scheme in globals.css takes over. Guessing
  // would be worse than omitting — a wrong guess IS the flash.
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html lang="en" data-theme={theme ?? undefined}>
      <body className={`${geistSans.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
