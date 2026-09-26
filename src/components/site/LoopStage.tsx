'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

export interface StageItem {
  /** Loop file basename: `${base}${id}.mp4` and `${base}${id}-poster.jpg`. */
  id: string;
  name: string;
  /** One short line under the name. */
  sub?: string;
  /** Shown only on the selected row. */
  desc?: string;
  href?: string;
  linkLabel?: string;
}

/**
 * A compact list with one stage: the selected item's loop plays in a single
 * frame beside the list. When a loop finishes the next item takes the stage,
 * with a rule on the selected row showing how far through it is.
 *
 * - Rows never change height (the selected item's description and link sit
 *   under the stage instead): a row growing under a hovering pointer would
 *   push the next row beneath it and select that one.
 * - Hover (fine pointers) or tap/click a row to select it. While the pointer
 *   is over the list it stays on the chosen item and loops it.
 * - Only plays while on screen. Under reduced motion nothing autoplays or
 *   advances; the poster of the selected item stands in, and rows still select.
 * - One video decodes at a time; the next one is preloaded.
 */
export function LoopStage({
  items,
  base,
  label,
  rowsAreLinks = false,
}: {
  items: readonly StageItem[];
  /** Folder under /public, with trailing slash, e.g. '/videos/services/'. */
  base: string;
  /** What the list is, for assistive tech. */
  label: string;
  /**
   * Rows navigate to each item's `href` instead of only selecting it (for a
   * list that is also the page's index). Hover and focus still preview.
   */
  rowsAreLinks?: boolean;
}) {
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const bar = useRef<HTMLElement | null>(null);
  const hovering = useRef(false);
  const visible = useRef(false);
  const reduced = useRef(false);

  // Play only the active loop, from the start, while on screen.
  useEffect(() => {
    reduced.current = prefersReducedMotion();
    videos.current.forEach((v, i) => {
      if (!v) return;
      if (i === active) {
        v.preload = 'auto';
        v.currentTime = 0;
        if (visible.current && !reduced.current) void v.play().catch(() => {});
      } else {
        v.pause();
        // Warm the next one so the hand-over never waits.
        v.preload = i === (active + 1) % items.length ? 'auto' : 'none';
      }
    });
  }, [active, items.length]);

  // Visibility: pause off screen, resume on return.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([e]) => {
        visible.current = e.isIntersecting;
        const v = videos.current[active];
        if (!v) return;
        if (e.isIntersecting && !reduced.current) void v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.2 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, [active]);

  // The progress rule and the hand-over at the end of each loop.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = videos.current[active];
      if (v && bar.current && v.duration)
        bar.current.style.transform = `scaleX(${v.currentTime / v.duration})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const v = videos.current[active];
    const onEnd = () => {
      if (hovering.current || reduced.current) {
        if (v && !reduced.current) {
          v.currentTime = 0;
          void v.play().catch(() => {});
        }
        return;
      }
      setActive((a) => (a + 1) % items.length);
    };
    v?.addEventListener('ended', onEnd);
    return () => {
      cancelAnimationFrame(raf);
      v?.removeEventListener('ended', onEnd);
    };
  }, [active, items.length]);

  const fine = () =>
    typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  return (
    <div
      className="lstage"
      ref={rootRef}
      onPointerMove={(e) => {
        if (e.movementX || e.movementY) hovering.current = fine();
      }}
      onPointerLeave={() => {
        hovering.current = false;
      }}
    >
      <div className="lstage-stage">
        <figure className="lstage-frame" aria-hidden>
          {items.map((it, i) => (
            <video
              key={it.id}
              ref={(el) => {
                videos.current[i] = el;
              }}
              className={i === active ? 'is-on' : undefined}
              poster={`${base}${it.id}-poster.jpg`}
              muted
              playsInline
              preload={i === 0 ? 'auto' : 'none'}
              width={544}
              height={680}
            >
              <source src={`${base}${it.id}.mp4`} type="video/mp4" />
            </video>
          ))}
        </figure>
        <div className="lstage-caption" aria-live="polite">
          {items[active].desc && <p>{items[active].desc}</p>}
          {items[active].href && (
            <Link className="link-u" href={items[active].href!}>
              {items[active].linkLabel ?? `More on ${items[active].name}`} <span aria-hidden>&rarr;</span>
            </Link>
          )}
        </div>
      </div>

      <ol className="lstage-list" aria-label={label}>
        {items.map((it, i) => {
          const on = i === active;
          return (
            <li key={it.id} className={`lstage-row${on ? ' is-on' : ''}`}>
              {rowsAreLinks && it.href ? (
                <Link
                  className="lstage-pick"
                  href={it.href}
                  // Only a pointer that actually moves selects: scrolling the page
                  // under a resting mouse fires enter events on every row it
                  // passes, which would flick through the whole list.
                  onPointerMove={(e) => {
                    if ((e.movementX || e.movementY) && fine() && !on) setActive(i);
                  }}
                  onFocus={() => setActive(i)}
                >
                  <span className="tag n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="lstage-name">{it.name}</span>
                  {it.sub && <span className="lstage-sub">{it.sub}</span>}
                </Link>
              ) : (
                <button
                  type="button"
                  className="lstage-pick"
                  aria-pressed={on}
                  onClick={() => setActive(i)}
                  // Only a pointer that actually moves selects: scrolling the page
                  // under a resting mouse fires enter events on every row it
                  // passes, which would flick through the whole list.
                  onPointerMove={(e) => {
                    if ((e.movementX || e.movementY) && fine() && !on) setActive(i);
                  }}
                  onFocus={() => setActive(i)}
                >
                  <span className="tag n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="lstage-name">{it.name}</span>
                  {it.sub && <span className="lstage-sub">{it.sub}</span>}
                </button>
              )}
              <span className="lstage-rule" aria-hidden>
                <i
                  ref={
                    on
                      ? (el) => {
                          bar.current = el;
                        }
                      : undefined
                  }
                />
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
