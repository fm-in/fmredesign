/**
 * A client film as a muted, looping <video>, with a lighter source for phones.
 *
 * `/public/videos/sm/` holds 360p encodes of every film at ~40% of the size.
 * Phones pick that source through `<source media>`, so a wall of six films
 * costs a phone about 4.5 MB rather than 12. The poster frame shows until the
 * video plays, and is all a reduced-motion visitor ever sees.
 *
 * Renders no state and runs no script: playback is owned by whoever lays the
 * films out (`playWhileVisible`, or a scroll scene).
 */
/**
 * Films with a 360p encode in /public/videos/sm/. `bhopal_manthan` has none:
 * its full file is already ~120 KB, and a `<source>` pointing at a missing
 * file costs phones a 404 before the fallback.
 */
const SMALL = new Set(['adi', 'astroo_apaar', 'concept_studio', 'giovanni', 'kanha', 'renny', 'skr_group']);

/** The phone-sized source for a film, or null when it has none. */
export function smallFilmSrc(id: string): string | null {
  return SMALL.has(id) ? `/videos/sm/${id}.mp4` : null;
}

export function FilmVideo({
  id,
  className,
  preload = 'metadata',
}: {
  /** Basename in /public/videos, without extension. */
  id: string;
  className?: string;
  preload?: 'none' | 'metadata' | 'auto';
}) {
  const small = smallFilmSrc(id);
  return (
    <video
      className={className}
      poster={`/videos/${id}-poster.jpg`}
      muted
      playsInline
      loop
      preload={preload}
      aria-hidden
    >
      {small && <source media="(max-width: 700px)" src={small} type="video/mp4" />}
      <source src={`/videos/${id}.mp4`} type="video/mp4" />
    </video>
  );
}
