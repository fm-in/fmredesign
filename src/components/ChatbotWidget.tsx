'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useRef } from 'react';

/**
 * AgentWorks chatbot widget — only visible on public-facing pages.
 * Hidden on /admin/* and /client/* routes.
 *
 * The script is loaded once (lazyOnload), then we toggle visibility
 * of the injected widget container based on the current route.
 */
export function ChatbotWidget() {
  const pathname = usePathname();
  const isPrivateRoute =
    pathname?.startsWith('/admin') || pathname?.startsWith('/client');

  // Toggle visibility of the widget container when route changes
  useEffect(() => {
    const toggle = () => {
      // Match all possible widget-injected elements
      const selectors = '[id^="aw-"], [class*="aw-widget"], [data-agentworks-widget], iframe[src*="agentworks"], [class*="agentworks"]';
      const els = document.querySelectorAll<HTMLElement>(selectors);
      els.forEach((el) => {
        el.style.display = isPrivateRoute ? 'none' : '';
      });
      // Also hide any fixed-position chat bubbles at bottom-right
      document.querySelectorAll<HTMLElement>('div[style*="position: fixed"][style*="bottom"]').forEach((el) => {
        if (el.querySelector('iframe') || el.id?.startsWith('aw-') || el.className?.includes('aw-')) {
          el.style.display = isPrivateRoute ? 'none' : '';
        }
      });
    };

    // Run immediately, after 1s, and after 3s (widget loads lazily)
    toggle();
    const t1 = setTimeout(toggle, 1000);
    const t2 = setTimeout(toggle, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isPrivateRoute, pathname]);

  // Only load the script on first render (not conditional — we toggle visibility instead)
  return (
    <Script
      src="https://agentworks-production.up.railway.app/api/v1/widget/embed.js"
      data-widget-key="rwTAE7bSICAHEtgao2oHlHuR-5a_usXWAO9xR-P1Y9Q"
      data-api-url="https://agentworks-production.up.railway.app/api/v1"
      strategy="lazyOnload"
    />
  );
}
