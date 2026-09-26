'use client';

import { useEffect } from 'react';
import { loadGsap, observeReveal, prefersReducedMotion } from '@/lib/motion';

/**
 * The home page's motion, in one place.
 *
 * Word-mask headline reveals, the two client marquees (which speed up and lean
 * with the visitor's scroll), the capability row that opens on phones, and the
 * closing band arriving through the ink circle. The hero (LetterWindow), the
 * work row (ReelRow) and the hover preview (CursorPreview) are their own
 * components; the campaign strip animates in CSS with a scroll timeline.
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

    cleanups.push(capabilityOnPhones());

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

        /* ---- close: arrives through the ink circle ------------------------ */
        // The launch video's ending, driven by scroll: the dark band opens as
        // a circle while it rises into view, and is complete by the time its
        // top reaches a quarter of the screen. Scrubbed, so scrolling back
        // closes it again; anyone arriving mid-page sees the right state.
        const close = document.getElementById('close');
        const mascot = document.querySelector<HTMLElement>('.close-mascot');
        if (close) {
          const radius = () => Math.hypot(close.offsetWidth, close.offsetHeight);
          gsap.fromTo(
            close,
            { clipPath: 'circle(0px at 50% 45%)' },
            {
              clipPath: () => `circle(${radius()}px at 50% 45%)`,
              ease: 'none',
              scrollTrigger: { trigger: close, start: 'top bottom', end: 'top 25%', scrub: 0.4, invalidateOnRefresh: true },
            },
          );
          // Once opened, the mascot pops in with a burst of confetti. Once per visit.
          if (mascot) {
            gsap.set(mascot, { scale: 0.55, rotate: -12 });
            gsap.to(mascot, {
              scale: 1,
              rotate: 0,
              duration: 0.9,
              ease: 'back.out(2.4)',
              scrollTrigger: { trigger: close, start: 'top 30%', once: true, onEnter: () => confetti(gsap, mascot) },
            });
          }
        }

        /* ---- closing mascot leans toward the pointer --------------------- */
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

        /* ---- client marquees, counter-running ---------------------------- */
        // Each row loops on its own; scrolling speeds both up and leans them
        // in the direction of travel, then they ease back to their pace.
        const loops: Array<ReturnType<typeof gsap.to>> = [];
        const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-mq]'));
        rows.forEach((row) => {
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
          loops.push(gsap.to(row, {
            x: dir < 0 ? 0 : -half,
            duration: 38,
            ease: 'none',
            repeat: -1,
          }));
        });
        if (rows.length) {
          const lean = rows.map((row) => gsap.quickTo(row, 'skewX', { duration: 0.5, ease: 'power3.out' }));
          let lastY = window.scrollY;
          let settle = 0;
          const onScroll = () => {
            const v = window.scrollY - lastY;
            lastY = window.scrollY;
            const speed = Math.min(Math.abs(v) / 12, 5);
            loops.forEach((l) => gsap.to(l, { timeScale: 1 + speed, duration: 0.25, overwrite: true }));
            lean.forEach((fn) => fn(Math.max(-8, Math.min(8, v * -0.4))));
            window.clearTimeout(settle);
            settle = window.setTimeout(() => {
              loops.forEach((l) => gsap.to(l, { timeScale: 1, duration: 0.9, ease: 'power2.out', overwrite: true }));
              lean.forEach((fn) => fn(0));
            }, 120);
          };
          window.addEventListener('scroll', onScroll, { passive: true });
          cleanups.push(() => {
            window.removeEventListener('scroll', onScroll);
            window.clearTimeout(settle);
          });
        }

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

/**
 * Phones have no hover, so the capability preview becomes inline: the row
 * nearest the middle of the screen opens and plays its clip; the others close.
 * Nothing loads until a row is active. Desktop keeps the cursor preview.
 */
function capabilityOnPhones(): () => void {
  if (!window.matchMedia('(max-width: 700px)').matches || prefersReducedMotion()) return () => {};
  if (typeof IntersectionObserver === 'undefined') return () => {};
  const rows = Array.from(document.querySelectorAll<HTMLElement>('.cap-row'));
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const row = entry.target as HTMLElement;
        row.classList.toggle('is-active', entry.isIntersecting);
        const video = row.querySelector('video');
        if (!video) continue;
        if (entry.isIntersecting) {
          video.preload = 'auto';
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    },
    // A thin band across the middle of the screen: one row at a time.
    { rootMargin: '-46% 0px -46% 0px' },
  );
  rows.forEach((row) => observer.observe(row));
  return () => observer.disconnect();
}

/** A burst of paper confetti from behind the mascot, in the brand colours. */
function confetti(gsap: typeof import('gsap').gsap, mascot: HTMLElement) {
  const host = mascot.parentElement;
  if (!host) return;
  const colours = ['#ee4276', '#f3ede6', '#c9325d', '#f2b84b'];
  const box = mascot.getBoundingClientRect();
  const hostBox = host.getBoundingClientRect();
  const cx = box.left - hostBox.left + box.width / 2;
  const cy = box.top - hostBox.top + box.height * 0.4;
  for (let i = 0; i < 26; i++) {
    const bit = document.createElement('i');
    bit.className = 'confetti-bit';
    bit.setAttribute('aria-hidden', 'true');
    bit.style.background = colours[i % colours.length];
    bit.style.left = `${cx}px`;
    bit.style.top = `${cy}px`;
    host.appendChild(bit);
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
    const dist = 120 + Math.random() * 200;
    gsap
      .timeline({ onComplete: () => bit.remove() })
      .fromTo(
        bit,
        { x: 0, y: 0, rotate: 0, opacity: 1 },
        { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, rotate: (Math.random() - 0.5) * 540, duration: 0.8, ease: 'power3.out' },
      )
      .to(bit, { y: '+=140', opacity: 0, duration: 0.9, ease: 'power1.in' });
  }
}
