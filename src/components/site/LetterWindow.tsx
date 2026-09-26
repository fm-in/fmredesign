'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { FilmVideo } from './FilmVideo';
import { easeInOut, playWhileVisible, prefersReducedMotion, span, stickyScene } from '@/lib/motion';

/**
 * The letter window: a headline cut out of the page, with a wall of client
 * films running behind it, so every letter shows a different piece of work.
 *
 * Two modes:
 * - `scroll` (home hero): the section grows tall and its stage sticks. As the
 *   visitor scrolls, the letters grow and dissolve into the full wall, and the
 *   copy returns over it. The wall keeps playing throughout.
 * - `still` (inner pages): the same cut-out, no scroll scene.
 *
 * How the cut-out works, with no canvas and no SVG mask: a sheet the colour of
 * white sits over the films with `mix-blend-mode: screen`, and the headline on
 * it is black. Screen with white is white; screen with black is the film. A
 * second sheet in the ground colour, multiplied, turns that white into the
 * paper. Dark theme runs the same trick inverted (black sheet, white letters,
 * multiply; then screen the ground back in).
 *
 * Progressive: the server renders the finished resting frame (letters over
 * posters, copy beside), which is also exactly what reduced-motion and no-JS
 * visitors keep. The section only becomes tall once script confirms motion.
 */
export function LetterWindow({
  films,
  lines,
  as: Heading = 'h1',
  mode = 'scroll',
  children,
}: {
  /** Six film ids from /public/videos. */
  films: readonly string[];
  /** The headline, one entry per line. */
  lines: readonly string[];
  as?: 'h1' | 'h2';
  mode?: 'scroll' | 'still';
  /** The copy: lede, actions, proof. Shown beside the letters, then over the open wall. */
  children?: ReactNode;
}) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const videos = section.querySelectorAll('video');
    const stopPlayback = playWhileVisible(videos, films.length);
    if (mode !== 'scroll' || prefersReducedMotion()) return stopPlayback;

    section.classList.add('is-scroll');
    const knock = section.querySelector<HTMLElement>('.lw-knock');
    const heading = section.querySelector<HTMLElement>('.lw-h');
    const wall = section.querySelector<HTMLElement>('.lw-wall');
    const shade = section.querySelector<HTMLElement>('.lw-shade');
    const copy = section.querySelector<HTMLElement>('.lw-copy');
    const strips = Array.from(videos);
    if (!knock || !heading || !wall || !shade || !copy) return stopPlayback;

    // Grow from the middle of the headline, measured at rest.
    const origin = () => {
      knock.style.transform = 'none';
      const k = knock.getBoundingClientRect();
      const h = heading.getBoundingClientRect();
      knock.style.transformOrigin = `${h.left - k.left + h.width * 0.4}px ${h.top - k.top + h.height * 0.5}px`;
    };
    origin();
    window.addEventListener('resize', origin);

    const stopScene = stickyScene(section, (p, t) => {
      const e = easeInOut(span(p, 0.04, 0.7));
      knock.style.transform = `scale(${1 + 2.2 * e})`;
      knock.style.opacity = String(1 - span(p, 0.2, 0.6));
      wall.style.transform = `scale(${1.1 - 0.1 * e})`;
      // Neighbouring strips drift in opposite directions, so the open wall never sits still.
      strips.forEach((v, i) => {
        v.style.transform = `translateY(${Math.sin(t * 0.4 + i * 1.3) * 3.5 * (i % 2 ? 1 : -1)}%)`;
      });
      shade.style.opacity = String(span(p, 0.58, 0.78));
      // The copy leaves, swaps sides while unseen, and returns over the wall.
      const open = p > 0.45;
      section.classList.toggle('is-open', open);
      const o = open ? span(p, 0.66, 0.86) : 1 - span(p, 0.03, 0.2);
      copy.style.opacity = String(o);
      copy.style.visibility = o < 0.02 ? 'hidden' : 'visible';
      copy.style.transform = open ? `translateY(${(1 - o) * 24}px)` : `translateY(${-(1 - o) * 24}px)`;
    });

    return () => {
      stopScene();
      stopPlayback();
      window.removeEventListener('resize', origin);
      section.classList.remove('is-scroll', 'is-open');
    };
  }, [films.length, mode]);

  const copy = (
    <div className="wrap lw-copy-wrap">
      <div className="lw-copy">
        {/* Over the open wall the headline returns in light type. The real
            heading is the cut-out, so this copy is decorative. */}
        {mode === 'scroll' && (
          <p className="lw-end-h" aria-hidden>
            {lines.join(' ')}
          </p>
        )}
        {children}
      </div>
    </div>
  );

  return (
    <section ref={sectionRef} className={`lw lw--${mode}`}>
      <div className="lw-stage">
        <div className="lw-wall" aria-hidden>
          {films.map((id) => (
            <div key={id}>
              <FilmVideo id={id} />
            </div>
          ))}
        </div>
        <div className="lw-knock">
          <div className="wrap">
            <Heading className="lw-h">
              {lines.map((line, i) => (
                <span key={line}>
                  {line}
                  {i < lines.length - 1 && <br />}
                </span>
              ))}
            </Heading>
          </div>
        </div>
        <div className="lw-tint" aria-hidden />
        {mode === 'scroll' && <div className="lw-shade" aria-hidden />}
        {mode === 'scroll' && copy}
      </div>
      {/* Still mode: the copy sits below the films, in the page's own flow. */}
      {mode === 'still' && copy}
    </section>
  );
}
