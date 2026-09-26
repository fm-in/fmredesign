'use client';

import { useEffect, useRef, useState } from 'react';
import { playWhileVisible, preloadWhenNear } from '@/lib/motion';

export interface Step {
  step: string;
  title: string;
  description: string;
}

/**
 * A numbered process beside the loop that acts it out. As the loop reaches
 * each step, that row lights up, so the list and the animation read as one.
 *
 * `windows` are the loop's own timings, in seconds, one [start, end) per step
 * (from the composition that rendered the video). Under reduced motion the
 * video does not play, the poster stands in, and every row stays at full
 * strength.
 */
export function StepsLoop({
  src,
  steps,
  windows,
  label,
}: {
  /** Path without extension, e.g. '/videos/steps/process'. */
  src: string;
  steps: readonly Step[];
  windows: readonly (readonly [number, number])[];
  label: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const stopPreload = preloadWhenNear([video]);
    const stop = playWhileVisible([video], 1);
    let raf = 0;
    const tick = () => {
      if (!video.paused) {
        const t = video.currentTime;
        const i = windows.findIndex(([a, b]) => t >= a && t < b);
        setActive(i === -1 ? windows.length - 1 : i);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopPreload();
      stop();
      cancelAnimationFrame(raf);
    };
  }, [windows]);

  return (
    <div className={`steps-loop${active === null ? '' : ' is-live'}`}>
      <ol className="steps-list" aria-label={label}>
        {steps.map((s, i) => (
          <li key={s.step} className={i === active ? 'is-on' : undefined}>
            <span className="tag n">{s.step}</span>
            <div>
              <h3 className="steps-title">{s.title}</h3>
              <p>{s.description}</p>
            </div>
          </li>
        ))}
      </ol>
      <figure className="steps-frame" aria-hidden>
        {/* `none` until `preloadWhenNear` raises it to `auto` a screen ahead:
            the loop still arrives whole before it plays (see ServiceLoop). */}
        <video ref={ref} poster={`${src}-poster.jpg`} muted playsInline loop preload="none" width={544} height={680}>
          <source src={`${src}.mp4`} type="video/mp4" />
        </video>
      </figure>
    </div>
  );
}
