'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

/**
 * The branded splash, on paper.
 *
 * Replaces the deleted `PageLoader`, which went out with the rest of the V2
 * system in Phase 9 and was never rebuilt. Same mechanics, restyled: the old
 * one washed the screen in a pink gradient, which was correct for the old site
 * and would now be the only screen that does not look like the rest of it.
 *
 * ## The one thing not to change
 *
 * The fade is a CSS animation (`.splash`, in site-components.css) on a fixed
 * clock from first paint. It is deliberately NOT a setTimeout in an effect.
 * When the original did it that way the overlay only began fading once React
 * had hydrated — ~6.6s on a throttled mobile connection — and because this is a
 * full-viewport z-index:99999 layer, Lighthouse measured the *loader* as the
 * LCP element with a 6663ms render delay. The page underneath cannot count as
 * painted while something covers it. In CSS the overlay clears on schedule
 * whether or not JS ever arrives.
 *
 * So the state below does exactly one job: unmounting the node on a repeat
 * visit. It never drives the first-visit fade.
 */
export function SiteLoader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Same tab, second page view — skip it entirely.
    if (sessionStorage.getItem('fm-loaded')) {
      setVisible(false);
      return;
    }
    sessionStorage.setItem('fm-loaded', '1');
    // Take the node out of the tree once the CSS animation has finished.
    const timer = setTimeout(() => setVisible(false), 1700);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="splash" aria-hidden>
      {/* Two files rather than a filter: the wordmark is the one thing on the
          site that must not be reinterpreted by a theme. Matches `.logo` in
          the header, whose CSS already swaps `.on-light` / `.on-dark`. */}
      {/* Both `alt=""`: the whole overlay is aria-hidden, and the header
          underneath already carries the announced wordmark. Giving each file a
          real alt would queue the brand name twice the moment anyone removed
          the aria-hidden — the same duplicate the header avoids. */}
      <span className="logo">
        <Image
          className="on-light splash-mark"
          src="/logo.png"
          alt=""
          width={380}
          height={236}
          priority
          sizes="(max-width: 640px) 42vw, 190px"
        />
        <Image
          className="on-dark splash-mark"
          src="/logo-white.png"
          alt=""
          width={380}
          height={236}
          priority
          sizes="(max-width: 640px) 42vw, 190px"
        />
      </span>

      <span className="splash-rule" />

      {/*
        The trimmed derivative, not the original. `brain-loading.webp` has the
        word "LOADING..." and a segmented progress bar baked into its pixels —
        raster text that blurs at this size, cannot be translated, and reports
        no real progress. The trim cuts at 77.5% (measured: the brain ends at
        78%, the text runs 79-83%, the bar 84-88%) and tight-crops to what is
        left, so the die-cut sticker edge hugs the artwork instead of tracing a
        bounding box or drawing a hard line across the crop.

        `priority`, because this is the one image guaranteed to be above the
        fold — it *is* the fold.
      */}
      <Image
        className="splash-brain brain-mark"
        src="/3dasset/brain-loading-cut.webp"
        alt=""
        width={699}
        height={717}
        priority
        sizes="(max-width: 640px) 38vw, 190px"
      />
    </div>
  );
}
