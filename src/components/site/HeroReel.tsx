'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

export interface ReelFilm {
  id: string;
  client: string;
  category: string;
}

/** Longest a clip holds the window before the next one takes over. */
const MAX_CLIP_SECONDS = 7;

/**
 * The hero's one moving picture: a single tall window that plays the studio's
 * films in turn, with a rule underneath that fills as each clip runs.
 *
 * Replaces a six-video wall. Six muted clips side by side read as texture; one
 * at a time, at size, reads as work — and only one video decodes at once.
 *
 * Two stacked <video> layers: the next clip loads into the hidden one and the
 * swap is an opacity crossfade, so there is never a black frame between clips.
 *
 * Progressive by construction:
 * - the server renders the first film with its poster, so the window is
 *   complete before this script runs and complete if it never does;
 * - reduced motion gets the poster and the clip list as buttons — nothing
 *   plays until someone asks it to;
 * - playback pauses when the window scrolls away or the tab is hidden.
 *
 * The numbered buttons are a real sequence (a playlist) and a real control:
 * pressing one plays that film.
 */
export function HeroReel({ films }: { films: readonly ReelFilm[] }) {
  const layers = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];
  const frameRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [front, setFront] = useState(0); // which layer is showing
  const [clipSeconds, setClipSeconds] = useState(MAX_CLIP_SECONDS);
  const [running, setRunning] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visible = useRef(true);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const show = useCallback(
    (next: number) => {
      const incoming = layers[1 - front].current;
      if (!incoming) return;
      const film = films[next];
      incoming.poster = `/videos/${film.id}-poster.jpg`;
      incoming.src = `/videos/${film.id}.mp4`;
      incoming.currentTime = 0;
      const start = () => {
        incoming.removeEventListener('canplay', start);
        void incoming.play().catch(() => {});
        setFront((f) => 1 - f);
        setIndex(next);
        const seconds = Math.min(MAX_CLIP_SECONDS, incoming.duration || MAX_CLIP_SECONDS);
        setClipSeconds(seconds);
        setProgressKey((k) => k + 1);
        // The outgoing layer stops once the crossfade has finished.
        const outgoing = layers[front].current;
        setTimeout(() => outgoing?.pause(), 700);
      };
      incoming.addEventListener('canplay', start);
      incoming.load();
    },
    // `layers` is stable (two refs created once).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [films, front],
  );

  // Advance on a timer while running and on screen.
  useEffect(() => {
    clearTimer();
    if (!running) return;
    timer.current = setTimeout(() => {
      if (visible.current && !document.hidden) show((index + 1) % films.length);
    }, clipSeconds * 1000);
    return clearTimer;
  }, [running, index, clipSeconds, films.length, show]);

  // Start once hydrated — unless the visitor prefers reduced motion.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const first = layers[0].current;
    if (!first) return;
    void first.play().then(
      () => {
        setClipSeconds(Math.min(MAX_CLIP_SECONDS, first.duration || MAX_CLIP_SECONDS));
        setRunning(true);
        setProgressKey((k) => k + 1);
      },
      () => {}, // autoplay blocked: the poster stands, the buttons still work
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pause off-screen and in hidden tabs; resume when back.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof IntersectionObserver === 'undefined') return;
    const current = () => layers[front].current;
    const observer = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
      if (!running) return;
      if (entry.isIntersecting) void current()?.play().catch(() => {});
      else current()?.pause();
    });
    observer.observe(frame);
    const onVisibility = () => {
      if (!running) return;
      if (document.hidden) current()?.pause();
      else if (visible.current) void current()?.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front, running]);

  const choose = (i: number) => {
    if (i === index) return;
    clearTimer();
    setRunning(true);
    show(i);
  };

  const film = films[index];

  return (
    <figure className="hero-reel" ref={frameRef} data-hero-reel>
      <div className="hero-reel-window">
        {[0, 1].map((layer) => (
          <video
            key={layer}
            ref={layers[layer]}
            className={layer === front ? 'is-front' : undefined}
            // Layer 0 is server-rendered with the first film so the window is
            // never empty; layer 1 is filled on the first swap.
            poster={layer === 0 ? `/videos/${films[0].id}-poster.jpg` : undefined}
            muted
            playsInline
            loop
            preload={layer === 0 ? 'metadata' : 'none'}
            aria-hidden
          >
            {layer === 0 && <source src={`/videos/${films[0].id}.mp4`} type="video/mp4" />}
          </video>
        ))}
        <span className="hero-reel-progress" aria-hidden>
          <i
            key={progressKey}
            className={running ? 'is-running' : undefined}
            style={{ animationDuration: `${clipSeconds}s` }}
          />
        </span>
      </div>
      <figcaption className="hero-reel-caption">
        <span aria-live="polite">
          <b>{film.client}</b> {film.category}
        </span>
        <span className="hero-reel-list">
          {films.map((f, i) => (
            <button
              key={f.id}
              type="button"
              onClick={() => choose(i)}
              aria-pressed={i === index}
              aria-label={`Play ${f.client}`}
            >
              {String(i + 1).padStart(2, '0')}
            </button>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
