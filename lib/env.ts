/**
 * Environment variable access, validated once at module load.
 *
 * Without this, a missing variable surfaces later as an opaque "Invalid URL" or
 * a failed fetch. Here it fails immediately and says which variable and how to
 * fix it — including on the Vercel build, where a forgotten variable is the most
 * common first-deploy failure.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in. ` +
        `On Vercel, add it under Settings -> Environment Variables and redeploy.`
    );
  }
  return value;
}

// The literal `process.env.X` reads below are deliberate and must not be
// refactored into a loop or a dynamic `process.env[name]` lookup. Next.js
// replaces NEXT_PUBLIC_* references with their values at build time by matching
// them statically in the source, so a dynamic lookup compiles to `undefined` in
// the browser bundle — and fails only in production.
export const SUPABASE_URL = required(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "NEXT_PUBLIC_SUPABASE_URL"
);

export const SUPABASE_PUBLISHABLE_KEY = required(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
);
