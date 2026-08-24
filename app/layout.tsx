import type { Metadata } from "next";
import { Geist } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
