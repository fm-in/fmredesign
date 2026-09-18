'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * The error boundary.
 *
 * Deliberately self-contained: no `SiteShell`, no header, no footer, no
 * images, no context. This renders *because something else already failed*, so
 * every dependency it takes is another way for the fallback itself to fail.
 * It reads the theme tokens directly — those are plain CSS custom properties
 * on `:root`, available with no component involved — and sets its own ground
 * colour since it is rendering outside `[data-site]`.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1.5rem',
        background: 'var(--site-ground, #f7f4ef)',
        color: 'var(--site-text, #13110f)',
        fontFamily: 'var(--site-font-sans, system-ui, sans-serif)',
      }}
    >
      <div style={{ maxWidth: '44ch' }}>
        <p
          style={{
            fontSize: '0.75rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--site-muted, #6b635c)',
            margin: 0,
          }}
        >
          Something went wrong
        </p>
        <h1
          style={{
            fontFamily: 'var(--site-font-display, Georgia, serif)',
            fontWeight: 400,
            fontSize: 'clamp(2rem, 5vw, 3.2rem)',
            lineHeight: 1.05,
            margin: '1.25rem 0 0',
          }}
        >
          This page did not load.
        </h1>
        <p style={{ color: 'var(--site-muted, #6b635c)', lineHeight: 1.6, marginTop: '1.5rem' }}>
          The error has been logged. Trying again often works; if it does not, tell us what you
          were doing and we will fix it.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem' }}>
          <button
            onClick={reset}
            style={{
              borderRadius: 'var(--radius-site-sm, 4px)',
              padding: '0.75rem 1.25rem',
              background: 'var(--site-text, #13110f)',
              color: 'var(--site-ground, #f7f4ef)',
              border: 0,
              font: 'inherit',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <Link
            href="/"
            style={{
              color: 'var(--site-text, #13110f)',
              textDecoration: 'underline',
              textUnderlineOffset: '6px',
              alignSelf: 'center',
            }}
          >
            Back to the homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
