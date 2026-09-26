'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { FilmVideo } from './FilmVideo';
import { easeInOut, playWhileVisible, prefersReducedMotion, span, stickyScene } from '@/lib/motion';

export type WallTile =
  | { kind: 'film'; id: string; label: string }
  | { kind: 'image'; src: string; label: string; site?: boolean };

/**
 * The live wall: a mosaic of films, sites and campaign work that the camera
 * pushes into as the visitor scrolls. The centre film ends in the middle and
 * every neighbour keeps playing around it, slightly dimmed, so the scene ends
 * on the whole body of work rather than on one clip.
 *
 * Layout is plain CSS grid (see `.lwall-grid`); script only moves a camera.
 * The push is one transform on the grid, computed from the centre tile's
 * resting box, so no tile is ever re-laid-out during the scroll.
 *
 * On phones the grid carries a third column that sits just past the right
 * edge at rest. The push brings it into view, so there is work on every side
 * of the centre film at the end.
 *
 * Progressive: the resting frame is server-rendered and complete; reduced
 * motion and no-JS visitors keep it, and the section is only made tall once
 * script confirms motion.
 */
export function LiveWall({
  tiles,
  centre,
  end,
  children,
}: {
  /** In grid order; see the `.lwall-grid` template for which cell each fills. */
  tiles: readonly WallTile[];
  /** Index of the film the camera pushes towards. */
  centre: number;
  /** Headline and copy, above the wall at rest. */
  children: ReactNode;
  /**
   * What the scene ends on, over the pushed-in wall. Decorative (the real
   * heading is in `children`), so keep links out of it.
   */
  end?: ReactNode;
}) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const stopPlayback = playWhileVisible(section.querySelectorAll('video'), 6);
    if (prefersReducedMotion()) return stopPlayback;

    section.classList.add('is-scroll');
    const stage = section.querySelector<HTMLElement>('.lwall-stage');
    const grid = section.querySelector<HTMLElement>('.lwall-grid');
    const copy = section.querySelector<HTMLElement>('.lwall-copy');
    const endLines = Array.from(section.querySelectorAll<HTMLElement>('.lwall-end > *'));
    const scrim = section.querySelector<HTMLElement>('.lwall-scrim');
    const cells = Array.from(section.querySelectorAll<HTMLElement>('.lwall-tile'));
    const target = cells[centre];
    if (!stage || !grid || !copy || !scrim || !target) return stopPlayback;

    // The centre tile's resting box, in stage coordinates, measured untransformed.
    let rest = { cx: 0, cy: 0, w: 1, h: 1 };
    const measure = () => {
      grid.style.transform = 'none';
      const s = stage.getBoundingClientRect();
      const r = target.getBoundingClientRect();
      rest = { cx: r.left - s.left + r.width / 2, cy: r.top - s.top + r.height / 2, w: r.width, h: r.height };
    };
    measure();
    window.addEventListener('resize', measure);

    const stopScene = stickyScene(section, (p, t) => {
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      const phone = W < 700;
      const e = easeInOut(span(p, 0.05, 0.78));
      const sEnd = phone ? (W * 0.74) / rest.w : (H * 0.86) / rest.h;
      const s = 1 + (sEnd - 1) * e;
      const fx = phone ? W * 0.5 : W * 0.6;
      const fy = phone ? H * 0.44 : H * 0.52;
      // A slow drift once open, so the finished wall is alive.
      const x = rest.cx + (fx - rest.cx) * e + Math.sin(t * 0.35) * 10 * e;
      const y = rest.cy + (fy - rest.cy) * e + Math.cos(t * 0.28) * 8 * e;
      // Scale about the grid's own origin: a point P lands at P*s + T.
      const g = grid.offsetLeft, gt = grid.offsetTop;
      grid.style.transform = `translate(${x - (rest.cx - g) * s - g}px, ${y - (rest.cy - gt) * s - gt}px) scale(${s})`;
      cells.forEach((c, i) => {
        if (i !== centre) c.style.filter = `brightness(${1 - 0.32 * e})`;
      });
      scrim.style.opacity = String(span(e, 0.4, 0.95));
      // The resting copy lifts away as the push starts…
      const out = 1 - span(e, 0, 0.28);
      copy.style.opacity = String(out);
      copy.style.visibility = out < 0.02 ? 'hidden' : 'visible';
      copy.style.transform = `translateY(${-(1 - out) * 28}px)`;
      // …and the ending settles in line by line once the camera has arrived.
      endLines.forEach((el, i) => {
        const k = easeInOut(span(e, 0.46 + i * 0.07, 0.72 + i * 0.07));
        el.style.opacity = String(k);
        el.style.transform = `translateY(${(1 - k) * 28}px)`;
      });
    });

    return () => {
      stopScene();
      stopPlayback();
      window.removeEventListener('resize', measure);
      section.classList.remove('is-scroll');
      grid.style.transform = '';
    };
  }, [centre, tiles.length]);

  return (
    <section ref={sectionRef} className="lwall">
      <div className="lwall-stage">
        <div className="wrap lwall-copy-wrap">
          <div className="lwall-copy">{children}</div>
        </div>
        <div className="lwall-grid">
          {tiles.map((tile, i) => (
            <figure
              key={i}
              className={`lwall-tile lwall-tile--${i}${tile.kind === 'image' && tile.site ? ' is-site' : ''}${i === centre ? ' is-centre' : ''}`}
            >
              {tile.kind === 'film' ? (
                <FilmVideo id={tile.id} />
              ) : (
                // Plain <img>: tiles are cropped by the grid, and the push scales
                // them past their box, which next/image's sizing would fight.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tile.src} alt="" loading="eager" decoding="async" />
              )}
              <figcaption className="sr-only">{tile.label}</figcaption>
            </figure>
          ))}
        </div>
        <div className="lwall-scrim" aria-hidden />
        {end && (
          <div className="wrap lwall-end-wrap" aria-hidden>
            <div className="lwall-end">{end}</div>
          </div>
        )}
      </div>
    </section>
  );
}
