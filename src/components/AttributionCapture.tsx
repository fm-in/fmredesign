'use client';

import { useEffect } from 'react';
import { captureFirstTouch } from '@/lib/attribution';

/** Records where a visitor first came from, so a later enquiry keeps it. Renders nothing. */
export function AttributionCapture() {
  useEffect(() => {
    try {
      captureFirstTouch(window.localStorage, window.location.href, document.referrer);
    } catch {
      // Storage blocked: attribution is best-effort.
    }
  }, []);
  return null;
}
