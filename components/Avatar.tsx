/**
 * PRD F1.4 — avatars are generated from the user id, never uploaded.
 *
 * A plain <img>, not next/image: the source is a remote SVG, which the image
 * optimiser will only handle with `dangerouslyAllowSVG` plus a remotePatterns
 * entry, and there is nothing to optimise about a 56px vector.
 *
 * alt="" is deliberate. The avatar is decorative — the user's name is always
 * rendered beside it, and duplicating it here would make screen readers
 * announce the same name twice.
 */
export function Avatar({
  src,
  size = 56,
}: {
  src: string | null;
  size?: number;
}) {
  if (!src) {
    return (
      <div
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-800"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- see note above
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-neutral-100 dark:bg-neutral-800"
    />
  );
}
