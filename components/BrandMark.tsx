/**
 * The MICANS collage, above the wordmark on login and signup.
 *
 * The image is a fully OPAQUE rectangle — measured, 0% transparent pixels — so
 * it cannot sit directly on a dark page without reading as a white box stuck
 * on. It gets a mount instead, and the mount is identical in both themes: the
 * artwork always sits on paper, which is a thing that makes sense, rather than
 * on a backing that appears only when the lights go out.
 *
 * The plate colour is sampled from the collage's own edge (corners run #f3e9d3
 * to #fceed3), so the paper continues past the image instead of framing it.
 * There is no seam to spot, and in light mode it reads as a warm card on the
 * near-white page rather than as a container at all.
 *
 * A plain <picture>, not next/image: the source is a fixed-size local asset
 * that never needs re-deriving per viewport, and this keeps the image out of
 * any runtime optimiser. WebP is 31 KB against the PNG's 74 KB, and the PNG is
 * there for anything that cannot take WebP. PRD N5 — under 3s on mobile data.
 *
 * alt="" because it is decorative: the <h1> immediately below says "Find Your
 * People", and describing the logo would make a screen reader announce the
 * product name twice. Same reasoning as Avatar (AD-27).
 */
export function BrandMark() {
  return (
    <div className="mx-auto w-fit rounded-2xl border border-logo-plate-border bg-logo-plate p-2.5 shadow-(--shadow-card)">
      <picture>
        <source srcSet="/logo-mica.webp" type="image/webp" />
        <img
          src="/logo-mica.png"
          alt=""
          width={383}
          height={300}
          // Height-driven so the plate tracks the art. 124px at 375px keeps the
          // whole screen above the fold on a small phone; 150px is the Stitch
          // size and takes over as soon as there is room.
          className="h-[124px] w-auto rounded-md sm:h-[150px]"
        />
      </picture>
    </div>
  );
}
