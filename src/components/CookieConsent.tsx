'use client';

import { useState, useEffect, useRef } from 'react';
import { readConsent, saveConsent, type ConsentChoice } from '@/lib/analytics/consent';

/**
 * The cookie banner, wired to Google Consent Mode.
 *
 * Accept and Decline both take effect on the current page view through
 * `saveConsent`, and the GTM bootstrap in the root layout re-applies the
 * stored choice before the container loads on every later visit.
 *
 * The old banner stored `fm-cookie-consent` and changed nothing either way;
 * the key moved to `fm-consent`, so those visitors are asked once more and
 * this time the answer counts.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let stored: ConsentChoice | null = null;
    try {
      stored = readConsent(window.localStorage);
    } catch {
      // Storage blocked: ask, and the choice lasts for this page view only.
    }
    if (!stored) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  /*
   * While the card is up, keep keyboard focus out from under it (WCAG 2.4.11).
   * Tabbing scrolls the focused link only just into view, which on this site
   * put it behind the card; scroll padding makes the browser stop short of it.
   */
  useEffect(() => {
    const card = cardRef.current;
    if (!visible || !card) return;
    const root = document.documentElement;
    const previous = root.style.scrollPaddingBottom;
    root.style.scrollPaddingBottom = `${card.offsetHeight + 24}px`;
    return () => {
      root.style.scrollPaddingBottom = previous;
    };
  }, [visible]);

  const choose = (choice: ConsentChoice) => {
    try {
      saveConsent(window.localStorage, choice);
    } catch {
      // Storage blocked. saveConsent writes storage first, so apply the
      // choice to this page view with an in-memory store instead.
      saveConsent({ setItem: () => {} }, choice);
    }
    setVisible(false);
  };

  if (!visible) return null;

  // A compact card in the bottom-left corner, in the site's own tokens (they
  // live on :root, so this works on portal pages too). It used to be a
  // full-width dark panel that hid the hero on desktop and a quarter of the
  // screen on phones, with the chat bubble sitting on its Accept button. The
  // right edge stops short of the bubble's corner at every width.
  return (
    // A region, not a dialog: it takes no focus and blocks nothing, and
    // "dialog" told screen readers to expect a modal they were not in.
    <div
      ref={cardRef}
      role="region"
      aria-label="Cookie consent"
      className="fixed z-[9998]"
      style={{
        left: 'max(12px, env(safe-area-inset-left))',
        right: 'max(88px, env(safe-area-inset-right))',
        bottom: 'max(12px, env(safe-area-inset-bottom))',
        maxWidth: 440,
        background: 'var(--site-raised, #fff)',
        color: 'var(--site-text, #13110f)',
        border: '1px solid var(--site-line, rgba(0,0,0,.14))',
        borderRadius: 'var(--radius-site-md, 10px)',
        boxShadow: 'var(--site-film-shadow, 0 20px 44px -24px rgba(0,0,0,.5))',
        fontFamily: 'var(--site-font-sans, system-ui, sans-serif)',
        padding: '16px 18px',
      }}
    >
      <p style={{ fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>
        We use analytics cookies to see how the site is used. Your choice — the site works the same
        either way.{' '}
        <a href="/privacy" style={{ color: 'var(--site-accent, #c9325d)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
          Privacy Policy
        </a>
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button
          onClick={() => choose('granted')}
          style={{
            minHeight: 44,
            padding: '0 18px',
            borderRadius: 999,
            background: 'var(--site-accent-solid, #c9325d)',
            color: '#fff',
            font: '600 0.8125rem/1 var(--site-font-sans, system-ui)',
          }}
        >
          Accept
        </button>
        <button
          onClick={() => choose('denied')}
          style={{
            minHeight: 44,
            padding: '0 18px',
            borderRadius: 999,
            border: '1px solid var(--site-line, rgba(0,0,0,.14))',
            color: 'var(--site-text, #13110f)',
            font: '600 0.8125rem/1 var(--site-font-sans, system-ui)',
          }}
        >
          Decline
        </button>
      </div>
    </div>
  );
}
