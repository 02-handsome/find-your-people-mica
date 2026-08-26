/**
 * PRD F1.4 — avatars are generated from the user id, never uploaded. The URL is
 * written by a trigger at signup (`supabase/migrations/0001_users.sql`), so
 * `avatar_url` is never null in practice and every render is a live request to
 * api.dicebear.com.
 *
 * That makes a third party a runtime dependency of every screen. If it is down,
 * blocked by a campus network, or rate-limiting, four empty circles per page is
 * the blank screen CLAUDE.md forbids, in miniature.
 *
 * So the initials are the DEFAULT state and the image paints over them. Nothing
 * switches; there is no event to miss. See docs/notes.md AD-27 for why this is
 * not an onError handler.
 *
 * A plain <img>, not next/image: the source is a remote SVG, which the image
 * optimiser will only handle with `dangerouslyAllowSVG` plus a remotePatterns
 * entry, and there is nothing to optimise about a 56px vector.
 */

/**
 * "Riya Sharma" -> "RS". One word gives one letter; no name gives none, which
 * degrades to the plain circle this component rendered before.
 *
 * Array.from(), not [0], so a name starting outside the Basic Multilingual
 * Plane yields a character rather than half a surrogate pair.
 */
function initials(name: string | null): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";

  const first = Array.from(words[0])[0] ?? "";
  const last =
    words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? "") : "";

  return (first + last).toUpperCase();
}

export function Avatar({
  src,
  name,
  size = 56,
}: {
  src: string | null;
  /**
   * Required, not optional. An optional prop would let a future call site
   * silently fall back to a blank circle; making it part of the shape means
   * the omission is a type error instead.
   */
  name: string | null;
  size?: number;
}) {
  return (
    // aria-hidden covers the whole avatar, not just the image. The initials are
    // visible text duplicating the name rendered beside them — without this a
    // screen reader announces the same person twice.
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-secondary leading-none font-medium tracking-tight text-muted-foreground select-none"
    >
      {initials(name)}

      {src ? (
        // Two things here are load-bearing, and both look removable.
        //
        // No background class: a failed image still occupies its box, so an
        // opaque background would paint a grey circle over the initials — the
        // fallback would exist and never be visible.
        //
        // alt="": measured, not assumed. A broken image with an empty alt
        // renders at 0x0 — nothing at all. The same image with alt="Some name"
        // reserves 103x24 for a broken-icon glyph and the text, drawn straight
        // over the initials. So "improving" this to alt={name} would break the
        // fallback as well as announcing the person twice.
        // eslint-disable-next-line @next/next/no-img-element -- see note above
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          // DiceBear already sees the viewer's IP and the subject's user id.
          // No reason to hand it the page URL as well.
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full"
        />
      ) : null}
    </span>
  );
}
