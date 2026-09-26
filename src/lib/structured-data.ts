import { SITE_URL } from '@/lib/site-url';

/**
 * A BreadcrumbList for one page, from Home down to the page itself.
 *
 * `position` is an ordinal starting at 1. Paths are site-relative ('/academy')
 * and made absolute here, because JSON-LD is not resolved against
 * `metadataBase` the way metadata URLs are.
 */
export function breadcrumbJsonLd(trail: ReadonlyArray<{ name: string; path: string }>) {
  const items = [{ name: 'Home', path: '/' }, ...trail];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.path === '/' ? SITE_URL : `${SITE_URL}${item.path}`,
    })),
  };
}

/**
 * Serialise JSON-LD for a <script> tag. `<` is escaped so a CMS-authored
 * string containing "</script>" cannot close the tag early.
 */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
