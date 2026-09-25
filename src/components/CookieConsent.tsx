'use client';

import { useState, useEffect } from 'react';
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

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9998] p-4 md:p-6"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div
        className="max-w-4xl mx-auto rounded-2xl bg-fm-ink/95 backdrop-blur-sm border border-white/10 p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-2xl"
        style={{
          animation: 'slideUp 0.4s ease-out',
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-white/90 text-sm leading-relaxed">
            We use cookies to understand how the site is used. You can accept or decline analytics
            cookies — the site works the same either way. See our{' '}
            <a href="/privacy" className="text-fm-magenta-400 hover:text-fm-magenta-300 underline underline-offset-2">
              Privacy Policy
            </a>.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => choose('denied')}
            className="px-5 py-2 rounded-lg border border-white/30 text-white/90 hover:bg-white/10 text-sm font-medium transition-colors"
          >
            Decline
          </button>
          <button
            onClick={() => choose('granted')}
            className="px-5 py-2 rounded-lg bg-fm-magenta-600 hover:bg-fm-magenta-700 text-white text-sm font-medium transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
