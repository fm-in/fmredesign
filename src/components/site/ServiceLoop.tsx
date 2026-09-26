'use client';

import { useEffect, useRef } from 'react';
import { playWhileVisible } from '@/lib/motion';

/**
 * A service explained by the mascot: a short seamless loop from
 * `/public/videos/services/{id}.mp4` with a poster frame.
 *
 * It illustrates what the section's text already says, so the video is
 * hidden from assistive tech. It plays only while on screen, and under
 * reduced motion the poster stands in. The poster is the loop's first frame,
 * so the hand-off from still to playing is seamless.
 */
export function ServiceLoop({ id }: { id: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    return playWhileVisible([video], 1);
  }, []);

  return (
    <figure className="service-loop" aria-hidden>
      <video
        ref={ref}
        poster={`/videos/services/${id}-poster.jpg`}
        muted
        playsInline
        loop
        // The whole clip (~200KB) up front: with only metadata loaded, every
        // loop back to the start stalled while the browser refetched it.
        preload="auto"
        width={544}
        height={680}
      >
        {/* MP4 only. A WebM (VP9) version failed to decode intermittently in
            Chrome on macOS, and a decode error does not fall back to the
            next source — the loop just froze. */}
        <source src={`/videos/services/${id}.mp4`} type="video/mp4" />
      </video>
    </figure>
  );
}
