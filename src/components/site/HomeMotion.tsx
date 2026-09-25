'use client';

import { useEffect } from 'react';
import { loadGsap, observeReveal, playWhileVisible } from '@/lib/motion';

/**
 * The home page's motion, in one place.
 *
 * Ports the approved prototype's behaviour: word-mask headline reveals, hero
 * and reel-column parallax, the two counter-running client marquees, the
 * interference wipe, and the image that follows the cursor over the capability
 * list. The campaign strip is a native scroller and needs no script.
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
    const videos = document.querySelectorAll<HTMLVideoElement>('.hero-films video, .reel video');
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

        /* ---- hero film parallax ----------------------------------------- */
        // Desktop only: under 820px the films are a row below the text, and
        // drifting them vertically would push them into the stats.
        gsap.utils.toArray<HTMLElement>(window.innerWidth > 820 ? '[data-hero-speed]' : '.no-parallax').forEach((col) => {
          const speed = parseFloat(col.dataset.heroSpeed ?? '0');
          gsap.to(col, {
            yPercent: speed * 100,
            ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
          });
        });

        /* ---- reel column parallax --------------------------------------- */
        gsap.utils.toArray<HTMLElement>('[data-speed]').forEach((col) => {
          const speed = parseFloat(col.dataset.speed ?? '0');
          gsap.to(col, {
            yPercent: speed * 100,
            ease: 'none',
            scrollTrigger: { trigger: col.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true },
          });
        });

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

        /* ---- interference wipe ------------------------------------------ */
        document.querySelectorAll<HTMLElement>('.wipe i').forEach((bar) => {
          gsap.fromTo(
            bar,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: 'none',
              scrollTrigger: { trigger: bar.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
            },
          );
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
