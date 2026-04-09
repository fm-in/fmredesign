'use client';

import { useCallback } from 'react';

interface CalButtonProps {
  /** Cal.com event slug — "fm-in/15min" or "fm-in/30min" */
  calLink: string;
  className?: string;
  children: React.ReactNode;
}

declare global {
  interface Window {
    Cal?: {
      (action: string, link: string, config?: Record<string, unknown>): void;
    };
  }
}

export function CalButton({ calLink, className, children }: CalButtonProps) {
  const openCal = useCallback(() => {
    if (window.Cal) {
      window.Cal('modal', calLink, { layout: 'month_view' });
      return;
    }
    // Script still loading — retry up to 3 times with 500ms intervals
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.Cal) {
        clearInterval(interval);
        window.Cal('modal', calLink, { layout: 'month_view' });
      } else if (attempts >= 3) {
        clearInterval(interval);
        // Final fallback: open in new tab
        window.open(`https://cal.com/${calLink}`, '_blank');
      }
    }, 500);
  }, [calLink]);

  return (
    <button type="button" onClick={openCal} className={className}>
      {children}
    </button>
  );
}
