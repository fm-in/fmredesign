'use client';

import { useEffect } from 'react';
import { contactMethodFor, track } from '@/lib/analytics/events';

/**
 * Sends `contact_click` for every WhatsApp and email link on the site.
 *
 * One delegated listener instead of an onClick on each link: those links live
 * in a dozen server components, and a new one added next month is tracked
 * without anyone remembering to. Capture phase, so a link inside a component
 * that stops propagation is still counted. Renders nothing.
 */
export function ContactClickTracker() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('a[href]');
      if (!link) return;
      const method = contactMethodFor(link.getAttribute('href') ?? '');
      if (!method) return;
      track({ event: 'contact_click', method, link_location: window.location.pathname });
    }
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);
  return null;
}
