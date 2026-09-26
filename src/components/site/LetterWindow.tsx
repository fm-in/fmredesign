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
    const stage = section.querySelector<HTMLElement>('.lw-stage');
    const knock = section.querySelector<HTMLElement>('.lw-knock');
    const heading = section.querySelector<HTMLElement>('.lw-h');
    const wall = section.querySelector<HTMLElement>('.lw-wall');
    const shade = section.querySelector<HTMLElement>('.lw-shade');
    const ring = section.querySelector<HTMLElement>('.lw-ring');
    const copy = section.querySelector<HTMLElement>('.lw-copy');
    const strips = Array.from(videos);
    if (!stage || !knock || !heading || !wall || !shade || !ring || !copy) return stopPlayback;
    const lines = Array.from(copy.children) as HTMLElement[];

    // The ink circle opens from the middle of the headline, measured at rest.
    let o = { x: 0, y: 0 };
    let reach = 1;
    const measure = () => {
      knock.style.transform = 'none';
      const st = stage.getBoundingClientRect();
      const h = heading.getBoundingClientRect();
      o = { x: h.left - st.left + h.width * 0.5, y: h.top - st.top + h.height * 0.5 };
      knock.style.transformOrigin = `${o.x}px ${o.y}px`;
      // Far enough to clear the stage's farthest corner.
      reach = Math.hypot(Math.max(o.x, st.width - o.x), Math.max(o.y, st.height - o.y)) + 40;
    };
    measure();
    window.addEventListener('resize', measure);

    const stopScene = stickyScene(section, (p, t) => {
      /*
       * The letters push toward the camera while an ink circle opens through
       * them. Inside the circle the white sheet is gone, so the films show at
       * full strength: there is never a half-faded, milky frame. The magenta
       * ring rides the circle's edge, the same move as the launch video and
       * the closing band, and thins out as it leaves the screen.
       */
      const e = easeInOut(span(p, 0.05, 0.62));
      const grow = 1 + 0.35 * e;
      const r = reach * e;
      knock.style.transform = `scale(${grow})`;
      // Mask coordinates live in the knock's own (scaled) space.
      const mask = e <= 0 ? 'none' : e >= 1 ? 'linear-gradient(transparent, transparent)'
        : `radial-gradient(circle ${r / grow}px at ${o.x}px ${o.y}px, transparent calc(100% - 1px), #000 100%)`;
      knock.style.maskImage = mask;
      knock.style.setProperty('-webkit-mask-image', mask);
      const ringOn = e > 0 && e < 1;
      ring.style.visibility = ringOn ? 'visible' : 'hidden';
      if (ringOn) {
        ring.style.width = ring.style.height = `${r * 2}px`;
        ring.style.transform = `translate(${o.x - r}px, ${o.y - r}px)`;
        ring.style.opacity = String(1 - span(r / reach, 0.55, 1));
      }
      wall.style.transform = `scale(${1.1 - 0.1 * e})`;
      // Neighbouring strips drift in opposite directions, so the open wall never sits still.
      strips.forEach((v, i) => {
        v.style.transform = `translateY(${Math.sin(t * 0.4 + i * 1.3) * 3.5 * (i % 2 ? 1 : -1)}%)`;
      });
      shade.style.opacity = String(span(p, 0.5, 0.72));

      // The copy lifts away together, then returns line by line over the wall.
      const open = p > 0.4;
      section.classList.toggle('is-open', open);
      copy.style.visibility = open ? (p > 0.56 ? 'visible' : 'hidden') : p < 0.2 ? 'visible' : 'hidden';
      lines.forEach((el, i) => {
        const k = open ? easeInOut(span(p, 0.58 + i * 0.045, 0.74 + i * 0.045)) : 1 - span(p, 0.03, 0.18);
        el.style.opacity = String(k);
        el.style.transform = `translateY(${(open ? 1 : -1) * (1 - k) * 28}px)`;
      });
    });

    return () => {
      stopScene();
      stopPlayback();
      window.removeEventListener('resize', measure);
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
        {mode === 'scroll' && <div className="lw-ring" aria-hidden />}
        {mode === 'scroll' && <div className="lw-shade" aria-hidden />}
        {mode === 'scroll' && copy}
      </div>
      {/* Still mode: the copy sits below the films, in the page's own flow. */}
      {mode === 'still' && copy}
    </section>
  );
}
