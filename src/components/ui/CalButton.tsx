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
    } else {
      // Fallback if embed script hasn't loaded
      window.open(`https://cal.com/${calLink}`, '_blank');
    }
  }, [calLink]);

  return (
    <button type="button" onClick={openCal} className={className}>
      {children}
    </button>
  );
}
