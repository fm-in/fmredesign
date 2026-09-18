'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { applyTheme, readStoredTheme, storeTheme, type SiteTheme } from './theme';

interface SiteThemeValue {
  theme: SiteTheme;
  toggleTheme: () => void;
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

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: SiteTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(next, document.documentElement);
      storeTheme(next);
      return next;
    });
  }, []);

  return (
    <SiteThemeContext.Provider value={{ theme, toggleTheme, ready }}>
      <div data-site className="relative min-h-screen">
        <PaperGrain />
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
