'use client';

import { useEffect, useRef } from 'react';
import { playWhileVisible } from '@/lib/motion';

/**
 * A service explained by the mascot: a short seamless loop from
 * `/public/videos/services/{id}.{webm,mp4}` with a poster frame.
 *
 * It illustrates what the section's text already says, so the video is
 * hidden from assistive tech. It plays only while on screen, and under
 * reduced motion the poster (the loop's key moment) stands in.
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
        preload="metadata"
        width={544}
        height={680}
      >
        <source src={`/videos/services/${id}.webm`} type="video/webm" />
        <source src={`/videos/services/${id}.mp4`} type="video/mp4" />
      </video>
    </figure>
  );
}
