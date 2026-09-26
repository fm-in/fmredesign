'use client';

import { useEffect, useRef } from 'react';
import { loadGsap } from '@/lib/motion';

/**
 * A piece of real work that follows the cursor over a list.
 *
 * Each item inside `listSelector` names its media in `data-preview` (an image)
 * or `data-preview-video` (an mp4, with `data-preview` as its poster). Hovering
 * an item shows it beside the pointer; leaving the list hides it.
 *
 * Listens by delegation on the list, not on each item, so it works for rows
 * that are cloned or added after mount — the client logo marquee duplicates
 * its children to loop.
 *
 * An enhancement only, and it answers the visitor's own movement rather than
 * playing by itself:
 * - fine pointers that can hover — never on touch;
 * - not at all with reduced motion (`loadGsap` returns null);
 * - media loads on the first hover, not with the page;
 * - the frame is `aria-hidden` — every item still says what it is in text.
 */
export function CursorPreview({ listSelector }: { listSelector: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const list = document.querySelector<HTMLElement>(listSelector);
    const frame = frameRef.current;
    const img = imgRef.current;
    const video = videoRef.current;
    if (!list || !frame || !img || !video) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      const gsap = await loadGsap();
      if (!gsap || cancelled) return;

      const moveX = gsap.quickTo(frame, 'x', { duration: 0.45, ease: 'power3.out' });
      const moveY = gsap.quickTo(frame, 'y', { duration: 0.45, ease: 'power3.out' });
      let current: HTMLElement | null = null;
      let shown = false;

      const show = (item: HTMLElement) => {
        if (item === current) return;
        current = item;
        const still = item.dataset.preview ?? '';
        const clip = item.dataset.previewVideo;
        if (clip) {
          frame.classList.add('is-video');
          video.poster = still;
          if (video.getAttribute('src') !== clip) video.src = clip;
          void video.play().catch(() => {});
        } else {
          frame.classList.remove('is-video');
          video.pause();
          img.src = still;
        }
        if (!shown) {
          shown = true;
          gsap.to(frame, { autoAlpha: 1, scale: 1, rotate: -2, duration: 0.35, ease: 'power3.out' });
        }
      };
      const hide = () => {
        current = null;
        shown = false;
        video.pause();
        gsap.to(frame, { autoAlpha: 0, scale: 0.92, rotate: 0, duration: 0.25, ease: 'power2.in' });
      };

      const onMove = (e: PointerEvent) => {
        // Offset right and up so the preview never sits under the cursor or
        // covers the item being read.
        moveX(e.clientX + 28);
        moveY(e.clientY - frame.offsetHeight / 2);
        const item = (e.target as Element | null)?.closest<HTMLElement>('[data-preview], [data-preview-video]');
        if (item && list.contains(item)) show(item);
        else if (shown) hide();
      };

      list.addEventListener('pointermove', onMove);
      list.addEventListener('pointerleave', hide);
      cleanup = () => {
        list.removeEventListener('pointermove', onMove);
        list.removeEventListener('pointerleave', hide);
        video.pause();
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [listSelector]);

  return (
    <div ref={frameRef} className="cursor-preview" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- src is set on hover */}
      <img ref={imgRef} alt="" decoding="async" />
      <video ref={videoRef} muted playsInline loop preload="none" />
    </div>
  );
}
