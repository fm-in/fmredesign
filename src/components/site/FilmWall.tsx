'use client';

import { useEffect, useRef } from 'react';
import { playWhileVisible } from '@/lib/motion';

export interface Film {
  /** Basename in /public/videos, without extension. */
  id: string;
  client: string;
  /** What the work actually was. Kept short — it sits under the film. */
  note: string;
}

/**
 * The client films.
 *
 * Eight vertical reels already exist in `/public/videos`, all 720×1280, and
 * before this they appeared on `/work` only. They are the strongest material
 * the studio has, so on paper they become the page's primary objects.
 *
 * Three things this handles that a plain `<video>` grid does not:
 *
 * - **Playback budget.** Six autoplaying videos decode in parallel and stall
 *   scrolling on a mid-range phone. `playWhileVisible` caps it at four and
 *   pauses anything off screen.
 * - **Poster frames.** Every film has a poster so the wall composes correctly
 *   before a single byte of video arrives, and so reduced-motion visitors see
 *   a complete page rather than black rectangles.
 * - **Cast, not glow.** Films are the only dark objects on bone paper, so the
 *   shadow token is a cast shadow in light and nothing at all in dark, where
 *   the ground is already darker than any cast.
 */
export function FilmWall({ films }: { films: readonly Film[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    return playWhileVisible(node.querySelectorAll('video'), 4);
  }, [films]);

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-6"
    >
      {films.map((film, index) => (
        <figure
          key={film.id}
          className="m-0"
          style={{
            /* A slight stagger down the row stops six identical rectangles
               reading as a contact sheet. Applied to the figure, not the
               frame, so each caption travels with its own film. */
            transform: index % 2 === 1 ? 'translateY(clamp(8px, 2vw, 28px))' : undefined,
          }}
        >
          <div
            className="relative overflow-hidden rounded-site-md"
            style={{
              aspectRatio: '9 / 16',
              boxShadow: 'var(--site-film-shadow)',
              background: 'var(--site-raised)',
            }}
          >
            {/*
              Two of the eight reels open on a near-white frame (Renny's is a
              blown-out exterior, Giovanni's a pale architectural render). On
              bone paper those dissolve at the edges and the wall loses its
              grid. A hairline inside the frame holds the edge without
              grading the client's work, and it costs nothing in dark where
              the films are already lighter than the ground.
            */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-site-md"
              style={{ boxShadow: 'inset 0 0 0 1px var(--site-line)', zIndex: 1 }}
            />
            <video
              className="h-full w-full object-cover"
              poster={`/videos/${film.id}-poster.jpg`}
              muted
              loop
              playsInline
              preload="none"
              aria-label={`${film.client} — ${film.note}`}
            >
              <source src={`/videos/${film.id}.mp4`} type="video/mp4" />
            </video>
          </div>
          <figcaption className="mt-3">
            <span className="block font-site-sans text-site-body text-site-text">{film.client}</span>
            <span className="block font-site-sans text-site-label uppercase text-site-muted">
              {film.note}
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
