/**
 * Shared Open Graph defaults.
 *
 * Next.js REPLACES a parent's `openGraph` object when a child defines one —
 * it does not merge them field by field. Every page layout here defined its
 * own openGraph with a title, description and url but no `images`, which
 * silently dropped the share image inherited from the root layout. The result
 * was that /services, /about, /work, /contact, /blog and every blog post
 * shared to WhatsApp and LinkedIn with a blank preview card.
 *
 * Spread these defaults into any page-level openGraph block:
 *
 *   openGraph: { ...OG_DEFAULTS, title: '…', description: '…', url: '/services' }
 *
 * Relative image and url values resolve against `metadataBase` in the root
 * layout, so pages never restate the origin.
 */

export const OG_IMAGE = {
  url: '/og-image.png',
  width: 1200,
  height: 630,
  alt: 'Freaking Minds — Creative Marketing Agency',
  type: 'image/png',
};

// Not `as const`: that widens to a readonly tuple, which Next's OpenGraph
// type rejects for `images`.
export const OG_DEFAULTS = {
  type: 'website' as const,
  // en_IN, not en_US: the audience and the business are both in India.
  locale: 'en_IN',
  siteName: 'Freaking Minds',
  images: [OG_IMAGE],
};
