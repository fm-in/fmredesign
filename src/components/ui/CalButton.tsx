'use client';

import { useCallback } from 'react';
import { bookingUrl, type BookingPrefill } from '@/lib/sales/links';

interface CalButtonProps {
  /** Cal.com event slug — "fm-in/15min" or "fm-in/30min" */
  calLink: string;
  className?: string;
  children: React.ReactNode;
  /** Prefills the booking form and tags the booking with the lead id. */
  prefill?: BookingPrefill;
}

declare global {
  interface Window {
    Cal?: (action: string, ...args: unknown[]) => void;
  }
}

export function CalButton({ calLink, className, children, prefill }: CalButtonProps) {
  const openCal = useCallback(() => {
    const config: Record<string, string> = { layout: 'month_view' };
    if (prefill?.name) config.name = prefill.name;
    if (prefill?.email) config.email = prefill.email;
    if (prefill?.leadId) config['metadata[leadId]'] = prefill.leadId;

    if (window.Cal) {
      window.Cal('modal', { calLink, config });
      return;
    }
    // The embed script has not run yet: open the booking page with the same prefill.
    window.open(bookingUrl(calLink, prefill), '_blank', 'noopener,noreferrer');
  }, [calLink, prefill]);

  return (
    <button type="button" onClick={openCal} className={className}>
      {children}
    </button>
  );
}
