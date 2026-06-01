'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export function PageLoader() {
  // Start visible so loader is in the initial paint (no flash of content)
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Repeat visit in same tab — hide immediately
    if (sessionStorage.getItem('fm-loaded')) {
      setVisible(false);
      return;
    }

    // First visit — mark as loaded, then fade out after 1s
    sessionStorage.setItem('fm-loaded', '1');
    const fadeTimer = setTimeout(() => setFadeOut(true), 1000);
    const hideTimer = setTimeout(() => setVisible(false), 1700);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
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
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.7s ease-out',
        pointerEvents: fadeOut ? 'none' as const : 'auto' as const,
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
      `}</style>
    </div>
  );
}
