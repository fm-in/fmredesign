'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

/**
 * Branded splash shown on first visit.
 *
 * PERFORMANCE NOTE: the fade-out is driven by a CSS animation, not by
 * setTimeout in an effect. Previously the overlay only began fading once React
 * had hydrated — on a throttled mobile connection that took ~6.6s, and because
 * this is a full-viewport z-index:99999 layer it meant Lighthouse measured the
 * *loader* as the LCP element with a 6663ms render delay. The real page could
 * not count as painted while it was covered.
 *
 * With a CSS animation the overlay clears on a fixed schedule from first paint,
 * independent of when (or whether) JS arrives. The timings below are identical
 * to the previous JS ones, so the visual experience is unchanged:
 *   hold 1000ms -> fade 700ms -> gone at 1700ms
 */
export function PageLoader() {
  // Only used to unmount on a repeat visit; the first-visit fade is pure CSS.
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Repeat visit in same tab — hide immediately
    if (sessionStorage.getItem('fm-loaded')) {
      setVisible(false);
      return;
    }
    sessionStorage.setItem('fm-loaded', '1');
    // Unmount once the CSS animation has finished so the node leaves the tree.
    const hideTimer = setTimeout(() => setVisible(false), 1700);
    return () => clearTimeout(hideTimer);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '60px',
        background: `
          linear-gradient(135deg,
            #fef7f9 0%, #fceef3 10%, #fae4ec 20%, #f7dbe5 30%,
            #f5d4e0 40%, #f5e0e8 50%, #f5d4e0 60%, #f7dbe5 70%,
            #fae4ec 80%, #fceef3 90%, #fef7f9 100%
          )
        `,
        animation: 'fmLoaderFade 1.7s ease-out forwards',
      }}
    >
      {/* Atmospheric bloom */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 100% 80% at 20% 10%, rgba(201,50,93,0.08) 0%, transparent 50%),
            radial-gradient(ellipse 80% 60% at 85% 30%, rgba(180,40,80,0.06) 0%, transparent 45%),
            radial-gradient(ellipse 90% 70% at 50% 90%, rgba(160,30,70,0.1) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
        }}
      />

      {/* Logo on left */}
      <Image
        src="/logo.png"
        alt="Freaking Minds"
        width={320}
        height={120}
        priority
        sizes="(max-width: 640px) 35vw, 320px"
        style={{
          width: 'min(320px, 35vw)',
          height: 'auto',
          position: 'relative',
        }}
      />

      {/* 3D Brain mascot on right */}
      <Image
        src="/3dasset/brain-loading.webp"
        alt="Loading..."
        width={300}
        height={300}
        priority
        sizes="(max-width: 640px) 30vw, 300px"
        style={{
          width: 'min(300px, 30vw)',
          height: 'auto',
          position: 'relative',
          animation: 'loaderFloat 2.5s ease-in-out infinite',
          filter: 'drop-shadow(0 20px 40px rgba(201,50,93,0.15))',
        }}
      />

      <style>{`
        @keyframes loaderFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        /* Hold fully opaque for 1s (0 -> 58.8% of 1.7s), then fade over 700ms.
           animation-fill-mode forwards keeps the end state, and
           visibility:hidden removes it from hit-testing and from LCP
           consideration without needing JS. */
        @keyframes fmLoaderFade {
          0%, 58.8% { opacity: 1; visibility: visible; }
          100% { opacity: 0; visibility: hidden; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes loaderFloat {
            0%, 100% { transform: none; }
          }
        }
      `}</style>
    </div>
  );
}
