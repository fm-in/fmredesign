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
      <source media="(max-width: 700px)" src={`/videos/sm/${id}.mp4`} type="video/mp4" />
      <source src={`/videos/${id}.mp4`} type="video/mp4" />
    </video>
  );
}
