'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

/**
 * A native sideways scroller that says so.
 *
 * A row of cards whose right edge happens to fall past the screen does not
 * read as scrollable; most visitors scroll straight past it. This adds four
 * cues, all on top of plain `overflow-x` scrolling (never a hijacked scroll):
 *
 * - **A one-time nudge.** The first time the row is mostly in view it glides
 *   left a card's-width fraction and settles back, like someone showing you
 *   it moves. Skipped under reduced motion, and if the visitor has already
 *   touched the row.
 * - **Controls.** Previous/next buttons (a card at a time) and a progress
 *   rule showing how far along the row you are.
 * - **An edge fade** on whichever side has more to see.
 * - **Drag on desktop.** A mouse cannot swipe sideways, so it can grab and
 *   drag the row. Touch keeps its native scrolling.
 */
export function SwipeRow({ children, label }: { children: ReactNode; label: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const [progress, setProgress] = useState(0);
  const touched = useRef(false);

  const sync = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    const max = t.scrollWidth - t.clientWidth;
    setEdges({ start: t.scrollLeft <= 4, end: t.scrollLeft >= max - 4 });
    setProgress(max > 0 ? t.scrollLeft / max : 1);
  }, []);

  // Scroll position → edge fades, button states and the progress rule.
  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    sync();
    t.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      t.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [sync]);

  // The nudge: once, the first time the row is properly in view.
  useEffect(() => {
    const t = trackRef.current;
    if (!t || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
    let raf = 0;
    let timer = 0;
    const nudge = () => {
      if (touched.current || t.scrollLeft > 4) return;
      const card = t.firstElementChild as HTMLElement | null;
      const reach = Math.min(180, (card?.offsetWidth ?? 300) * 0.55);
      // Snapping would yank the row back mid-glide, so it is off for the moment.
      const snap = t.style.scrollSnapType;
      t.style.scrollSnapType = 'none';
      const start = performance.now();
      const OUT = 700, HOLD = 250, BACK = 800;
      const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
      const step = (now: number) => {
        if (touched.current) { t.style.scrollSnapType = snap; return; }
        const e = now - start;
        const x = e < OUT ? ease(e / OUT) : e < OUT + HOLD ? 1 : 1 - ease(Math.min(1, (e - OUT - HOLD) / BACK));
        t.scrollLeft = reach * x;
        if (e < OUT + HOLD + BACK) raf = requestAnimationFrame(step);
        else t.style.scrollSnapType = snap;
      };
      raf = requestAnimationFrame(step);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      timer = window.setTimeout(nudge, 350);
    }, { threshold: 0.6 });
    observer.observe(t);
    const stop = () => { touched.current = true; };
    t.addEventListener('pointerdown', stop, { passive: true });
    t.addEventListener('wheel', stop, { passive: true });
    t.addEventListener('keydown', stop);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      t.removeEventListener('pointerdown', stop);
      t.removeEventListener('wheel', stop);
      t.removeEventListener('keydown', stop);
    };
  }, []);

  // Drag to scroll, for mice only.
  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    let down: { x: number; left: number; id: number } | null = null;
    let moved = false;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = { x: e.clientX, left: t.scrollLeft, id: e.pointerId };
      moved = false;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      if (!moved && Math.abs(dx) > 4) {
        moved = true;
        t.setPointerCapture(down.id);
        t.classList.add('is-dragging');
      }
      if (moved) t.scrollLeft = down.left - dx;
    };
    const onUp = () => {
      if (!down) return;
      down = null;
      t.classList.remove('is-dragging');
    };
    // A drag must not also count as a click on whatever card it ended over.
    const onClick = (e: MouseEvent) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } };
    t.addEventListener('pointerdown', onDown);
    t.addEventListener('pointermove', onMove);
    t.addEventListener('pointerup', onUp);
    t.addEventListener('pointercancel', onUp);
    t.addEventListener('click', onClick, true);
    return () => {
      t.removeEventListener('pointerdown', onDown);
      t.removeEventListener('pointermove', onMove);
      t.removeEventListener('pointerup', onUp);
      t.removeEventListener('pointercancel', onUp);
      t.removeEventListener('click', onClick, true);
    };
  }, []);

  const page = (dir: 1 | -1) => {
    const t = trackRef.current;
    if (!t) return;
    touched.current = true;
    const card = t.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(t).columnGap) || 0;
    t.scrollBy({ left: dir * ((card?.offsetWidth ?? 300) + gap), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  return (
    <div className={`swipe${edges.start ? ' at-start' : ''}${edges.end ? ' at-end' : ''}`}>
      <div className="strip-track" ref={trackRef} tabIndex={0} role="region" aria-label={label}>
        {children}
      </div>
      <div className="swipe-bar">
        <span className="swipe-rule" aria-hidden>
          <i style={{ transform: `scaleX(${Math.max(0.08, progress)})` }} />
        </span>
        <div className="swipe-btns">
          <button type="button" onClick={() => page(-1)} disabled={edges.start} aria-label="Previous">
            <span aria-hidden>&larr;</span>
          </button>
          <button type="button" onClick={() => page(1)} disabled={edges.end} aria-label="Next">
            <span aria-hidden>&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
}
