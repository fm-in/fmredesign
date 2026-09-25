'use client';

import { useEffect, useRef } from 'react';
import { loadGsap } from '@/lib/motion';

/**
 * A piece of real work that follows the cursor over a list.
 *
 * Each row inside `listSelector` names its image in `data-preview`. Hovering a
 * row shows that image beside the pointer; leaving the list hides it.
 *
 * An enhancement only, and it answers the visitor's own movement rather than
 * playing by itself:
 * - fine pointers that can hover — never on touch;
 * - not at all with reduced motion (`loadGsap` returns null);
 * - images load on the first hover, not with the page;
 * - the frame is `aria-hidden` — every row still says what it is in text.
 */
export function CursorPreview({ listSelector }: { listSelector: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const list = document.querySelector<HTMLElement>(listSelector);
    const frame = frameRef.current;
    const img = imgRef.current;
    if (!list || !frame || !img) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let cancelled = false;
    const cleanups: Array<() => void> = [];

    (async () => {
      const gsap = await loadGsap();
      if (!gsap || cancelled) return;

      const moveX = gsap.quickTo(frame, 'x', { duration: 0.45, ease: 'power3.out' });
      const moveY = gsap.quickTo(frame, 'y', { duration: 0.45, ease: 'power3.out' });
      let current = '';

      const onMove = (e: PointerEvent) => {
        // Offset right and up so the image never sits under the cursor or
        // covers the row being read.
        moveX(e.clientX + 28);
        moveY(e.clientY - frame.offsetHeight / 2);
      };
      const onEnterRow = (e: Event) => {
        const src = (e.currentTarget as HTMLElement).dataset.preview;
        if (!src) return;
        if (src !== current) {
          current = src;
          img.src = src;
        }
        gsap.to(frame, { autoAlpha: 1, scale: 1, rotate: -2, duration: 0.35, ease: 'power3.out' });
      };
      const onLeaveList = () => {
        gsap.to(frame, { autoAlpha: 0, scale: 0.92, rotate: 0, duration: 0.25, ease: 'power2.in' });
      };

      const rows = list.querySelectorAll<HTMLElement>('[data-preview]');
      rows.forEach((row) => row.addEventListener('pointerenter', onEnterRow));
      list.addEventListener('pointermove', onMove);
      list.addEventListener('pointerleave', onLeaveList);
      cleanups.push(() => {
        rows.forEach((row) => row.removeEventListener('pointerenter', onEnterRow));
        list.removeEventListener('pointermove', onMove);
        list.removeEventListener('pointerleave', onLeaveList);
      });
    })();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
  }, [listSelector]);

  return (
    <div ref={frameRef} className="cursor-preview" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- src is set on hover */}
      <img ref={imgRef} alt="" decoding="async" />
    </div>
  );
}
