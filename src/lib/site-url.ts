/**
 * The site's canonical origin — the single source of truth for it.
 *
 * WHY www: production serves https://www.freakingminds.in, and the apex
 * redirects to it. Every URL the app emitted previously said non-www, which
 * meant all 26 sitemap entries and every canonical tag pointed at a URL that
 * redirects. Search Console reports that as "Page with redirect" for the
 * whole sitemap.
 *
 * Changing which form is canonical is now a one-line change here (plus the
 * redirect direction in the Vercel dashboard). It used to mean editing 56
 * hardcoded strings across 23 files.
 *
 * Prefer relative URLs in page metadata — `metadataBase` in the root layout
 * resolves them against this, so individual pages never restate the host.
 * Use this constant only where an absolute URL is genuinely required:
 * sitemap, robots, RSS, JSON-LD @id, and email templates.
 */

const FALLBACK = 'https://www.freakingminds.in';

/** No trailing slash, so `${SITE_URL}/path` is always well-formed. */
export const SITE_URL: string = (process.env.NEXT_PUBLIC_SITE_URL || FALLBACK).replace(/\/+$/, '');
