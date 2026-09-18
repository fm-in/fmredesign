import Image from 'next/image';

/**
 * A still — a website screenshot, a campaign creative, a team portrait.
 *
 * Takes the same frame treatment as `FilmWall`: the hairline holds the edge of
 * a high-key image against bone paper, and the cast shadow is a token so it
 * disappears in dark rather than being special-cased.
 *
 * `bleed` lets an image run past its column instead of sitting in a box. The
 * current site puts every image in a rounded card of the same size, which is
 * what makes the middle of those pages read flat.
 */
export function StillFrame({
  src,
  alt,
  caption,
  ratio = '16 / 10',
  bleed = false,
  priority = false,
  /*
   * Must describe the real slot, not the viewport. Left at the default
   * `100vw`, a three-across grid asked the optimizer for the 1920px variant of
   * an 890KB screenshot to fill a 420px frame — fourteen times on one page.
   */
  sizes = '(min-width: 1024px) 32vw, (min-width: 640px) 48vw, 100vw',
}: {
  src: string;
  alt: string;
  caption?: string;
  ratio?: string;
  bleed?: boolean;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <figure className="m-0">
      <div
        className="relative overflow-hidden rounded-site-md"
        style={{
          aspectRatio: ratio,
          boxShadow: 'var(--site-film-shadow)',
          background: 'var(--site-raised)',
          // Past its column, not out of the viewport: the negative margin is
          // capped by the gutter so it can never cause horizontal scroll.
          marginInline: bleed ? 'calc(-1 * var(--spacing-site-gutter) / 2)' : undefined,
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-site-md"
          style={{ boxShadow: 'inset 0 0 0 1px var(--site-line)', zIndex: 1 }}
        />
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
      {caption && (
        <figcaption className="mt-3 font-site-sans text-site-label uppercase text-site-muted">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
