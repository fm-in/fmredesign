'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FilmVideo } from './FilmVideo';
import { playWhileVisible, prefersReducedMotion } from '@/lib/motion';

export interface ReelFilm {
  id: string;
  client: string;
  category: string;
}

const PHONE = '(max-width: 700px)';

/**
 * The work row. Desktop: four films side by side, all playing while in view;
 * the one under the pointer lifts forward and the rest step back (CSS only).
 *
 * Phone: the Deck. The same four figures stack into a fanned pile; the front
 * film plays, a swipe (or the next button) sends it to the back. Only the
 * front film decodes, so the phone plays one video, not four.
 *
 * Progressive: the server renders the desktop row, which on a phone without
 * script is a native horizontal scroller (see `.reel-row` CSS) — complete and
 * usable. Script turns the phone layout into the deck.
 */
export function ReelRow({ films }: { films: readonly ReelFilm[] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [deck, setDeck] = useState(false);
  const [order, setOrder] = useState(() => films.map((_, i) => i));
  const [leaving, setLeaving] = useState<number | null>(null);
  const drag = useRef<{ x: number; dx: number; el: HTMLElement } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(PHONE);
    const sync = () => setDeck(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Desktop: every film in view plays. Deck: only the front one.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const videos = Array.from(row.querySelectorAll('video'));
    if (!deck) return playWhileVisible(videos, 4);
    const front = row.querySelector<HTMLElement>('[data-slot="0"] video') as HTMLVideoElement | null;
    videos.forEach((v) => { if (v !== front) v.pause(); });
    if (!front || prefersReducedMotion()) return;
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) void front.play().catch(() => {});
      else front.pause();
    }, { threshold: 0.3 });
    observer.observe(front);
    return () => observer.disconnect();
  }, [deck, order]);

  const next = useCallback(() => {
    if (leaving !== null) return;
    setLeaving(order[0]);
    window.setTimeout(() => {
      setOrder((o) => [...o.slice(1), o[0]]);
      setLeaving(null);
    }, prefersReducedMotion() ? 0 : 460);
  }, [leaving, order]);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (!deck || e.currentTarget.dataset.slot !== '0') return;
    drag.current = { x: e.clientX, dx: 0, el: e.currentTarget };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.classList.add('is-drag');
  };
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    d.dx = e.clientX - d.x;
    d.el.style.transform = `translateX(${d.dx}px) rotate(${d.dx * 0.05}deg)`;
  };
  const onPointerUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    d.el.classList.remove('is-drag');
    d.el.style.transform = '';
    if (Math.abs(d.dx) > 60) next();
  };

  return (
    <div className={`reel-row${deck ? ' is-deck' : ''}`} ref={rowRef}>
      {films.map((f, i) => {
        const slot = order.indexOf(i);
        return (
          <figure
            className={`reel${leaving === i ? ' is-leaving' : ''}`}
            key={f.id}
            data-slot={deck ? slot : undefined}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            aria-hidden={deck && slot !== 0 ? true : undefined}
          >
            <FilmVideo id={f.id} preload={deck && slot !== 0 ? 'none' : 'metadata'} />
            <figcaption>
              <b>{f.client}</b>
              <span className="tag">{f.category}</span>
            </figcaption>
          </figure>
        );
      })}
      {deck && (
        // No aria-label: the visible text ("Next film 01 / 04") is the name, so
        // speech-input users can say what they see (WCAG 2.5.3).
        <button type="button" className="reel-next" onClick={next}>
          Next film <span aria-hidden>&rarr;</span>
          <span className="reel-count">
            {String(order[0] + 1).padStart(2, '0')} / {String(films.length).padStart(2, '0')}
          </span>
        </button>
      )}
    </div>
  );
}
