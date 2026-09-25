'use client';

import { useEffect } from 'react';
import { loadGsap, observeReveal, playWhileVisible } from '@/lib/motion';

/**
 * The home page's motion, in one place.
 *
 * Word-mask headline reveals, the hero reel's opening, the two counter-running
 * client marquees, and the closing mascot leaning toward the pointer. The
 * capability preview (CursorPreview) and the hero playlist (HeroReel) are their
 * own components; the campaign strip is a native scroller and needs no script.
 *
 * Renders nothing. Every effect targets markup the server already sent, so the
 * page is complete and readable before this loads — and if it never loads, the
 * page is still complete and readable. GSAP is imported dynamically and is not
 * fetched at all for a visitor who prefers reduced motion.
 */
export function HomeMotion() {
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    let cancelled = false;

    // Films: capped playback, and paused off-screen.
    // The hero window runs its own playlist (HeroReel); this is the work row.
    const videos = document.querySelectorAll<HTMLVideoElement>('.reel video');
    cleanups.push(playWhileVisible(videos, 4));

    // Reveals need no timeline, so they never pull GSAP in.
    cleanups.push(observeReveal(document.querySelectorAll('[data-reveal]')));

    (async () => {
      const gsap = await loadGsap();
      if (!gsap || cancelled) return;

      const ctx = gsap.context(() => {
        /* ---- headline word masks ---------------------------------------- */
        document.querySelectorAll<HTMLElement>('[data-mask]').forEach((el) => {
          const words = el.textContent?.split(/\s+/).filter(Boolean) ?? [];
          if (!words.length) return;
          // Rebuilt as spans only now that motion is confirmed available; the
          // server-rendered text stays a plain readable string otherwise.
          el.innerHTML = words
            .map((w) => `<span class="m"><i>${w}</i></span>`)
            .join(' ');
          gsap.from(el.querySelectorAll('.m > i'), {
            yPercent: 115,
            duration: 0.9,
            ease: 'expo.out',
            stagger: 0.055,
            scrollTrigger: { trigger: el, start: 'top 85%' },
          });
        });

        /* ---- hero reel: the page's one orchestrated moment ------------- */
        // The window opens from a slightly inset frame to full, in step with
        // the headline's word reveal. It starts visible — the inset only
        // trims the edges — so nothing on screen ever disappears.
        const reelWindow = document.querySelector<HTMLElement>('.hero-reel-window');
        if (reelWindow) {
          gsap.fromTo(
            reelWindow,
            { clipPath: 'inset(7% 9% 7% 9% round 6px)' },
            { clipPath: 'inset(0% 0% 0% 0% round 6px)', duration: 1.3, ease: 'expo.out', delay: 0.15 },
          );
        }

        /* ---- closing mascot leans toward the pointer --------------------- */
        const close = document.getElementById('close');
        const mascot = document.querySelector<HTMLElement>('.close-mascot');
        if (close && mascot && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
          const leanX = gsap.quickTo(mascot, 'x', { duration: 0.8, ease: 'power3.out' });
          const leanY = gsap.quickTo(mascot, 'y', { duration: 0.8, ease: 'power3.out' });
          const onMove = (e: PointerEvent) => {
            const r = close.getBoundingClientRect();
            leanX(((e.clientX - r.left) / r.width - 0.5) * 16);
            leanY(((e.clientY - r.top) / r.height - 0.5) * 16);
          };
          const onLeave = () => { leanX(0); leanY(0); };
          close.addEventListener('pointermove', onMove);
          close.addEventListener('pointerleave', onLeave);
          cleanups.push(() => {
            close.removeEventListener('pointermove', onMove);
            close.removeEventListener('pointerleave', onLeave);
          });
        }

        /* ---- client marquees, counter-running --------------------------- */
        document.querySelectorAll<HTMLElement>('[data-mq]').forEach((row) => {
          const dir = parseFloat(row.dataset.mq ?? '1');
          /*
            Duplicate until one cycle is at least as wide as the viewport.
            A single duplication is enough at 1440px but not on a 2560px
            display: the row would run out of content mid-scroll and leave a
            visible gap at the trailing edge.
          */
          const original = row.innerHTML;
          let copies = 1;
          while (row.scrollWidth / (copies + 1) < window.innerWidth && copies < 8) {
            row.innerHTML += original;
            copies += 1;
          }
          if (copies === 1) {
            row.innerHTML += original;
            copies = 2;
          }
          const half = row.scrollWidth / copies;
          gsap.set(row, { x: dir < 0 ? -half : 0 });
          gsap.to(row, {
            x: dir < 0 ? 0 : -half,
            duration: 38,
            ease: 'none',
            repeat: -1,
          });
        });

      });

      cleanups.push(() => ctx.revert());
    })();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
  }, []);

  // The header's scrolled state is a plain listener, not part of the GSAP
  // branch: GSAP loads after hydration, and until it did the header stayed a
  // see-through scrim over body text — worst on slow mobile connections.
  useEffect(() => {
    const hdr = document.querySelector<HTMLElement>('.hdr');
    if (!hdr) return;
    const onScroll = () => hdr.classList.toggle('is-stuck', window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return null;
}
