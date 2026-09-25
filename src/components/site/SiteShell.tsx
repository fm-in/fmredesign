'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { applyTheme, readStoredTheme, storeTheme, type SiteTheme } from './theme';

interface SiteThemeValue {
  theme: SiteTheme;
  /** `origin` is where the switch was pressed; the new theme spreads from it. */
  toggleTheme: (origin?: { x: number; y: number }) => void;
  /**
   * False until the client has read the stored preference. The toggle uses it
   * to avoid announcing "switch to dark" during the one frame before it knows
   * which theme is actually showing.
   */
  ready: boolean;
}

const SiteThemeContext = createContext<SiteThemeValue | null>(null);

export function useSiteTheme(): SiteThemeValue {
  const value = useContext(SiteThemeContext);
  if (!value) throw new Error('useSiteTheme must be used inside <SiteShell>');
  return value;
}

/**
 * The public site's page ground.
 *
 * Replaces `V2PageWrapper`, which rendered a fixed starfield of 25 animated
 * DOM nodes, two blurred ellipses and three drifting particles behind every
 * page — all of it client-generated, and all of it repainting on scroll.
 *
 * What is left is a paper grain: one element, one gradient, no animation.
 *
 * `data-site` is the scope for every token rule in `site-tokens.css`. Without
 * it the new tokens would restyle the admin and portal pages too.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<SiteTheme>('light');
  const [ready, setReady] = useState(false);

  // The inline head script has already set the attribute; this only syncs
  // React's copy of it, so there is no flash and no second paint.
  useEffect(() => {
    setTheme(readStoredTheme());
    setReady(true);
  }, []);

  const toggleTheme = useCallback((origin?: { x: number; y: number }) => {
    const root = document.documentElement;
    const next: SiteTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    const swap = () => {
      applyTheme(next, root);
      storeTheme(next);
      setTheme(next);
    };

    // The new theme opens as a circle from the switch (View Transitions API).
    // Feature-detected: without the API, or with reduced motion, it is the
    // same instant swap as before. The attribute change inside the callback is
    // synchronous, which is all the transition needs to capture both states.
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!doc.startViewTransition || reduced) {
      swap();
      return;
    }
    root.style.setProperty('--vt-x', `${origin?.x ?? window.innerWidth - 60}px`);
    root.style.setProperty('--vt-y', `${origin?.y ?? 40}px`);
    doc.startViewTransition(swap);
  }, []);

  return (
    <SiteThemeContext.Provider value={{ theme, toggleTheme, ready }}>
      <div data-site className="relative min-h-screen">
        <PaperGrain />
        {/*
          No <main> here: a page passes its header and footer as children too,
          so wrapping them would put the banner and contentinfo landmarks
          inside the main one. Each page renders its own
          <main id="main-content"> between them.
        */}
        <div className="relative" style={{ zIndex: 1 }}>
          {children}
        </div>
      </div>
    </SiteThemeContext.Provider>
  );
}

/**
 * A warm, barely-there stock texture. `multiply` on paper, `normal` on ink —
 * both come from tokens, so dark mode is a pure swap with no second element.
 */
function PaperGrain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0"
      style={{
        zIndex: 0,
        opacity: 'var(--site-grain-opacity)',
        mixBlendMode: 'var(--site-grain-blend)' as React.CSSProperties['mixBlendMode'],
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}
