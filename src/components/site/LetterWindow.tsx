'use client';

import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { FilmVideo } from './FilmVideo';
import { easeInOut, playWhileVisible, prefersReducedMotion, span, stickyScene } from '@/lib/motion';

/**
 * The letter window: a headline cut out of the page, with a wall of client
 * films running behind it, so every letter shows a different piece of work.
 *
 * Two modes:
 * - `scroll` (home hero): full-width type over the films, with the copy in a
 *   row along the bottom. Scrolling holds on the letters, then they grow and
 *   dissolve into the full wall, which holds before a closing line and the
 *   actions arrive. The wall keeps playing throughout.
 * - `still` (inner pages): the same cut-out, no scroll scene.
 *
 * How the cut-out works, with no canvas and no SVG mask: a sheet the colour of
 * white sits over the films with `mix-blend-mode: screen`, and the headline on
 * it is black. Screen with white is white; screen with black is the film. A
 * second sheet in the ground colour, multiplied, turns that white into the
 * paper. Dark theme runs the same trick inverted (black sheet, white letters,
 * multiply; then screen the ground back in).
 *
 * Progressive: the server renders the finished resting frame, which is also
 * what reduced-motion and no-JS visitors keep. The section only becomes tall
 * once script confirms motion.
 */
export function LetterWindow({
  films,
  lines,
  wideLines,
  endLine,
  as: Heading = 'h1',
  mode = 'scroll',
  tone = 'colour',
  children,
}: {
  /** Six film ids from /public/videos. */
  films: readonly string[];
  /** The headline, one entry per line, as set on phones. */
  lines: readonly string[];
  /** The same words broken differently for wide screens. Defaults to `lines`. */
  wideLines?: readonly string[];
  /** Scroll mode: the line the open wall ends on, above the actions. */
  endLine?: string;
  as?: 'h1' | 'h2';
  mode?: 'scroll' | 'still';
  /**
   * `colour`: the films as shot (the home hero, where they are the work).
   * `duotone`: tinted in the brand's magenta-to-gold (inner pages, where the
   * letters are the point, not the footage).
   */
  tone?: 'colour' | 'duotone';
  /** The copy: lede, actions, proof. */
  children?: ReactNode;
}) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const videos = section.querySelectorAll('video');
    const stopPlayback = playWhileVisible(videos, films.length);
    if (mode !== 'scroll') return stopPlayback;

    const stage = section.querySelector<HTMLElement>('.lw-stage');
    const knock = section.querySelector<HTMLElement>('.lw-knock');
    const heading = section.querySelector<HTMLElement>('.lw-h');
    const copyWrap = section.querySelector<HTMLElement>('.lw-copy-wrap');
    if (!stage || !knock || !heading || !copyWrap) return stopPlayback;

    /*
     * Fit the type to the width. The widest line is measured at a reference
     * size and scaled so it spans the column exactly — CSS alone can only
     * guess at a typeface's widths. Capped by height, so the lines always
     * clear the copy row on a short laptop screen.
     */
    const fit = () => {
      if (stage.clientWidth <= 700) {
        stage.style.removeProperty('--lw-size');
        return;
      }
      stage.style.setProperty('--lw-size', '100px');
      heading.style.width = 'max-content';
      const natural = heading.getBoundingClientRect().width;
      heading.style.width = '';
      const box = heading.parentElement ?? stage;
      const pad = parseFloat(getComputedStyle(box).paddingLeft) + parseFloat(getComputedStyle(box).paddingRight);
      const column = box.clientWidth - pad;
      const top = heading.getBoundingClientRect().top - stage.getBoundingClientRect().top;
      // The copy row's own height plus the wrap's bottom padding: the wrap
      // itself covers the whole stage, so its height says nothing.
      const row = copyWrap.firstElementChild as HTMLElement | null;
      const below = (row?.offsetHeight ?? 0) + parseFloat(getComputedStyle(copyWrap).paddingBottom);
      const room = stage.clientHeight - top - below - 32;
      const rowCount = heading.querySelectorAll('.lw-br-w').length + 1;
      const byWidth = (100 * column) / natural;
      const byHeight = room / (rowCount * 0.9);
      stage.style.setProperty('--lw-size', `${Math.floor(Math.min(byWidth, byHeight))}px`);
    };
    fit();

    if (prefersReducedMotion()) {
      window.addEventListener('resize', fit);
      return () => {
        stopPlayback();
        window.removeEventListener('resize', fit);
      };
    }

    section.classList.add('is-scroll');

    // First visit: the splash is still up. The words rise as it fades, so
    // the page opens on one orchestrated moment. Timed from the splash's own
    // animation clock, and only if it has not started fading, so nobody sees
    // the words vanish before they rise.
    const splash = document.querySelector<HTMLElement>('.splash');
    const splashAt = Number(splash?.getAnimations?.()[0]?.currentTime ?? Infinity);
    let introTimer = 0;
    if (splash && splashAt < 1000) {
      section.style.setProperty('--lw-delay', `${Math.round(1150 - splashAt)}ms`);
      section.classList.add('lw-intro');
      introTimer = window.setTimeout(() => section.classList.remove('lw-intro'), 3400);
    }

    // Window parallax: the films shift a little against the pointer, as if
    // seen through real windows. Fine pointers only; eased every frame.
    const aim = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const onMove = (ev: PointerEvent) => {
      aim.x = ev.clientX / window.innerWidth - 0.5;
      aim.y = ev.clientY / window.innerHeight - 0.5;
    };
    const onLeave = () => {
      aim.x = 0;
      aim.y = 0;
    };
    if (fine) {
      stage.addEventListener('pointermove', onMove);
      stage.addEventListener('pointerleave', onLeave);
    }
    const wall = section.querySelector<HTMLElement>('.lw-wall');
    const shade = section.querySelector<HTMLElement>('.lw-shade');
    const copy = section.querySelector<HTMLElement>('.lw-copy');
    const strips = Array.from(videos);
    if (!wall || !shade || !copy) return stopPlayback;
    const rows = Array.from(copy.children) as HTMLElement[];

    // The letters grow about the middle of the headline, measured at rest.
    const measure = () => {
      knock.style.transform = 'none';
      fit();
      const st = stage.getBoundingClientRect();
      const h = heading.getBoundingClientRect();
      knock.style.transformOrigin = `${h.left - st.left + h.width * 0.5}px ${h.top - st.top + h.height * 0.5}px`;
    };
    measure();
    window.addEventListener('resize', measure);

    /*
     * The scene runs over a little over three screens of scrolling, in beats:
     *   0.00–0.10  hold on the letters
     *   0.06–0.16  the copy row steps away
     *   0.10–0.62  the letters grow and dissolve into the wall
     *   0.60–0.68  hold on the open wall
     *   0.68–0.92  the closing line and actions arrive, one after another
     *   0.92–1.00  hold, then the page carries on
     */
    const stopScene = stickyScene(section, (p, t) => {
      /*
       * The letters come towards the viewer and dissolve into the wall they
       * were cut from: they grow about the middle of the headline while the
       * paper around them fades, so the films inside the letters become the
       * whole screen. (An ink-circle version read as a plain wipe.)
       */
      const e = easeInOut(span(p, 0.1, 0.62));
      knock.style.transform = `scale(${1 + 2.4 * e})`;
      knock.style.opacity = String(1 - easeInOut(span(p, 0.26, 0.6)));
      cur.x += (aim.x - cur.x) * 0.06;
      cur.y += (aim.y - cur.y) * 0.06;
      const depth = 1 - e; // the parallax settles as the wall opens
      wall.style.transform = `translate(${-cur.x * 34 * depth}px, ${-cur.y * 24 * depth}px) scale(${1.1 - 0.1 * e})`;
      wall.style.gap = `${6 * e}px`;
      // Neighbouring strips drift in opposite directions, so the open wall never sits still.
      // Each strip sits at its own depth, so the parallax has layers.
      strips.forEach((v, i) => {
        const layer = [10, 22, 14, 26, 12, 18][i % 6] * depth;
        v.style.transform = `translate(${-cur.x * layer}px, ${Math.sin(t * 0.4 + i * 1.3) * 3.5 * (i % 2 ? 1 : -1)}%)`;
      });
      shade.style.opacity = String(span(p, 0.58, 0.74));

      const open = p > 0.4;
      section.classList.toggle('is-open', open);
      copy.style.visibility = open ? (p > 0.66 ? 'visible' : 'hidden') : p < 0.17 ? 'visible' : 'hidden';
      rows.forEach((el, i) => {
        const k = open ? easeInOut(span(p, 0.68 + i * 0.06, 0.8 + i * 0.06)) : 1 - span(p, 0.06, 0.16);
        el.style.opacity = String(k);
        el.style.transform = `translateY(${(open ? 1 : -1) * (1 - k) * 28}px)`;
      });
    });

    return () => {
      stopScene();
      stopPlayback();
      window.removeEventListener('resize', measure);
      window.clearTimeout(introTimer);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      section.classList.remove('is-scroll', 'is-open', 'lw-intro');
    };
  }, [films.length, mode]);

  // Words with the line breaks for both widths: `.lw-br-n` breaks on phones,
  // `.lw-br-w` on wide screens. One heading, so assistive tech reads it once.
  const words = lines.join(' ').split(' ');
  const ends = (set: readonly string[]) => {
    const out = new Set<number>();
    let n = -1;
    set.forEach((l) => {
      n += l.split(' ').length;
      out.add(n);
    });
    out.delete(words.length - 1);
    return out;
  };
  const narrowEnds = ends(lines);
  const wideEnds = ends(wideLines ?? lines);

  const headline = words.map((w, i) => (
    <Fragment key={i}>
      <span className="lw-w" style={{ ['--i' as string]: i }}>
        {w}
      </span>
      {/* A space always follows a word, so the heading's text reads as words
          even where a line break stands in for it. Where only one width
          breaks here, the space is shown only at the other (a space before a
          break just collapses). */}
      {i < words.length - 1 &&
        (narrowEnds.has(i) === wideEnds.has(i) ? ' ' : (
          <span className={narrowEnds.has(i) ? 'lw-sp-w' : 'lw-sp-n'}> </span>
        ))}
      {narrowEnds.has(i) && <br className="lw-br-n" />}
      {wideEnds.has(i) && <br className="lw-br-w" />}
    </Fragment>
  ));

  const copy = (
    <div className="wrap lw-copy-wrap">
      <div className="lw-copy">
        {/* Over the open wall: one short line above the actions. The real
            heading is the cut-out, so this line is decorative. */}
        {mode === 'scroll' && endLine && (
          <p className="lw-end-line" aria-hidden>
            {endLine}
          </p>
        )}
        {children}
      </div>
    </div>
  );

  return (
    <section ref={sectionRef} className={`lw lw--${mode} lw--${tone}`}>
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
            <Heading className="lw-h">{headline}</Heading>
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
