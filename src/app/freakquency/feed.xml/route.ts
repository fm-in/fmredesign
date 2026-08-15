/**
 * RSS 2.0 feed for the blog — ${SITE_URL}/freakquency/feed.xml
 *
 * The site had no feed of any kind. A feed is what lets an aggregator, a
 * newsreader or another site subscribe to the blog instead of re-checking it,
 * and it is the mechanism this project depends on when it consumes other
 * publishers — worth offering the same affordance outward.
 *
 * Lives at `blog/feed.xml/` rather than inside the `(index)` route group so it
 * is a sibling of `[slug]`. Next.js resolves static segments before dynamic
 * ones, so this wins over `[slug]` matching the literal string "feed.xml".
 */

import { getAllPublishedPosts } from '@/lib/blog-data-public';
import { SITE_URL } from '@/lib/site-url';


/** Match the blog's own revalidation window. */
export const revalidate = 60;

/**
 * Escape text for XML. Post titles and excerpts are author-supplied and
 * routinely contain ampersands and quotes; an unescaped one makes the whole
 * document unparseable, which fails silently in most readers.
 */
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** RSS requires an RFC-822 date; toUTCString() is the compatible superset. */
function rfc822(date: string): string {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? new Date().toUTCString()
    : parsed.toUTCString();
}

export async function GET() {
  let posts: Awaited<ReturnType<typeof getAllPublishedPosts>> = [];
  try {
    posts = await getAllPublishedPosts();
  } catch (err) {
    // An empty channel is a valid feed. Returning a 500 would make
    // subscribers back off, so degrade rather than fail.
    console.error('[feed.xml] could not load posts:', err);
  }

  const items = posts
    .map((post) => {
      const url = `${SITE_URL}/freakquency/${post.slug}`;
      return `    <item>
      <title>${xmlEscape(post.title)}</title>
      <link>${xmlEscape(url)}</link>
      <guid isPermaLink="true">${xmlEscape(url)}</guid>
      <pubDate>${rfc822(post.date)}</pubDate>
      <description>${xmlEscape(post.excerpt)}</description>
      <category>${xmlEscape(post.category)}</category>
      <dc:creator>${xmlEscape(post.author)}</dc:creator>
    </item>`;
    })
    .join('\n');

  const lastBuild = posts.length ? rfc822(posts[0].date) : new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Freakquency — Freaking Minds</title>
    <link>${SITE_URL}/freakquency</link>
    <description>Digital marketing insights, SEO strategy and growth tactics from the Freaking Minds agency floor in Bhopal.</description>
    <language>en-in</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${SITE_URL}/freakquency/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 's-maxage=60, stale-while-revalidate=86400',
    },
  });
}
