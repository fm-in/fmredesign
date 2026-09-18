'use client';

import { Moon, Sun } from 'lucide-react';
import { useSiteTheme } from './SiteShell';

/**
 * Light / dark switch.
 *
 * Dark mode is opt-in: `prefers-color-scheme` is never consulted, so this
 * button is the only way into it. That makes its label load-bearing — it has
 * to say what will happen, not what is showing.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme, ready } = useSiteTheme();
  const goingDark = theme !== 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      // Before the stored preference is read, the button still renders (so the
      // header does not reflow) but announces nothing misleading.
      aria-label={ready ? (goingDark ? 'Switch to dark mode' : 'Switch to light mode') : 'Switch colour theme'}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-site-sm transition-colors ${className}`.trim()}
      style={{ border: '1px solid var(--site-line)', color: 'var(--site-text)' }}
    >
      {goingDark ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
    </button>
  );
}
