/**
 * Minimal RSS 2.0 / Atom parser.
 *
 * WHY NOT A LIBRARY
 * -----------------
 * jsdom is a devDependency and unavailable at runtime. The two obvious
 * packages both add transitive dependencies to the production tree —
 * fast-xml-parser@5 pulls six, rss-parser pulls xml2js — which is a poor
 * trade for extracting four fields per item.
 *
 * The risk of hand-rolling is real: naive regex parsing gets CDATA, entities
 * and namespaced tags wrong in ways that only show up on one publisher.
 * That risk is bounded empirically instead of theoretically — the test suite
 * runs this against captured XML from every enabled feed, so a publisher whose
 * markup breaks it fails CI rather than silently importing nothing.
 *
 * This is deliberately NOT a general XML parser. It assumes machine-generated,
 * well-formed feeds. If a feed ever needs more than this, reach for a real
 * parser rather than adding another special case here.
 */

export interface ParsedFeedItem {
  title: string;
  link: string;
  /** Plain text, HTML stripped and collapsed. */
  excerpt: string;
  publishedAt: Date | null;
  guid: string | null;
  imageUrl: string | null;
}

export interface ParsedFeed {
  format: 'rss' | 'atom' | 'unknown';
  title: string | null;
  items: ParsedFeedItem[];
}

/** Longest excerpt we keep. Link-and-excerpt only; never the full article. */
const MAX_EXCERPT = 320;

const NAMED_ENTITIES: Record<string, string> = {
  lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', hellip: '…',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  eacute: 'é', egrave: 'è', amp: '&',
};

/**
 * Decode XML/HTML entities.
 *
 * `&amp;` is resolved LAST and in the same pass, not by a second sweep —
 * decoding it first turns `&amp;lt;` into `<`, which is how double-decoding
 * bugs silently corrupt titles containing escaped markup.
 */
export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named !== undefined ? named : match;
  });
}

/**
 * Unwrap CDATA, decode entities, strip tags, collapse whitespace.
 *
 * ORDER MATTERS, and the obvious order is wrong. Stripping tags before
 * decoding leaves entity-escaped markup untouched — `&lt;img src=...&gt;` is
 * just text at that point — and the later decode then turns it into live
 * markup in what is supposed to be plain text. Five of the seventeen real
 * feeds ship their descriptions escaped that way rather than in CDATA.
 *
 * Decoding first means one pass: escaped markup becomes real markup, then
 * gets stripped with everything else. Text that was legitimately `&amp;`
 * correctly ends up as `&`.
 */
function toPlainText(raw: string): string {
  let s = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  s = decodeEntities(s);
  s = s.replace(/<[^>]*>/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

/** Inner content of the first matching tag, namespace-aware (`dc:creator`). */
function tagContent(block: string, ...names: string[]): string | null {
  for (const name of names) {
    // Allow an optional namespace prefix and any attributes.
    const re = new RegExp(
      `<(?:[a-zA-Z0-9-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[a-zA-Z0-9-]+:)?${name}>`,
      'i'
    );
    const m = re.exec(block);
    if (m && m[1].trim()) return m[1];
  }
  return null;
}

/** Value of an attribute on the first tag of the given name. */
function tagAttr(block: string, name: string, attr: string): string | null {
  const re = new RegExp(`<(?:[a-zA-Z0-9-]+:)?${name}(\\s[^>]*)?/?>`, 'i');
  const m = re.exec(block);
  if (!m || !m[1]) return null;
  const a = new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`, 'i').exec(m[1]);
  return a ? decodeEntities(a[1]) : null;
}

/**
 * The link for an item.
 *
 * RSS puts the URL in the element body; Atom puts it in a href attribute on a
 * self-closing tag and may list several with different `rel` values, where
 * only `alternate` is the human-readable page.
 */
function extractLink(block: string): string {
  const alternate = /<link(?:\s[^>]*)?\srel=["']alternate["'][^>]*>/i.exec(block);
  if (alternate) {
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(alternate[0]);
    if (href) return decodeEntities(href[1]);
  }
  const body = tagContent(block, 'link');
  if (body) {
    const text = toPlainText(body);
    if (text.startsWith('http')) return text;
  }
  const href = tagAttr(block, 'link', 'href');
  if (href) return href;
  // Some feeds only carry a permalink guid.
  const guid = tagContent(block, 'guid', 'id');
  const g = guid ? toPlainText(guid) : '';
  return g.startsWith('http') ? g : '';
}

/** Best available image: media:content, enclosure, or the first inline img. */
function extractImage(block: string): string | null {
  for (const tag of ['content', 'thumbnail', 'enclosure']) {
    const url = tagAttr(block, tag, 'url');
    if (url && /^https?:\/\//.test(url)) return url;
  }
  const inline = /<img[^>]+src\s*=\s*["']([^"']+)["']/i.exec(block);
  if (inline && /^https?:\/\//.test(inline[1])) return decodeEntities(inline[1]);
  return null;
}

function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(toPlainText(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseFeed(xml: string): ParsedFeed {
  const head = xml.slice(0, 1500);
  const isAtom = /<feed[\s>]/i.test(head) && !/<rss[\s>]/i.test(head);
  const itemTag = isAtom ? 'entry' : 'item';

  const blocks =
    xml.match(new RegExp(`<${itemTag}(?:\\s[^>]*)?>[\\s\\S]*?</${itemTag}>`, 'gi')) || [];

  const items: ParsedFeedItem[] = [];
  for (const block of blocks) {
    const title = toPlainText(tagContent(block, 'title') || '');
    const link = extractLink(block);
    // Skip anything without both — an item we cannot link to is useless in a
    // link-and-excerpt feed, and a blank title would render as an empty card.
    if (!title || !link) continue;

    const rawExcerpt =
      tagContent(block, 'description', 'summary', 'subtitle') ||
      tagContent(block, 'encoded', 'content') ||
      '';
    let excerpt = toPlainText(rawExcerpt);
    if (excerpt.length > MAX_EXCERPT) {
      excerpt = excerpt.slice(0, MAX_EXCERPT).replace(/\s+\S*$/, '') + '…';
    }

    const guidRaw = tagContent(block, 'guid', 'id');

    items.push({
      title,
      link,
      excerpt,
      publishedAt: parseDate(tagContent(block, 'pubDate', 'published', 'updated', 'date')),
      guid: guidRaw ? toPlainText(guidRaw) : null,
      imageUrl: extractImage(block),
    });
  }

  // Channel title lives outside any item; strip them first so a post title
  // cannot be mistaken for the feed's own.
  const withoutItems = xml.replace(
    new RegExp(`<${itemTag}(?:\\s[^>]*)?>[\\s\\S]*?</${itemTag}>`, 'gi'),
    ''
  );
  const feedTitle = tagContent(withoutItems, 'title');

  return {
    format: blocks.length === 0 ? 'unknown' : isAtom ? 'atom' : 'rss',
    title: feedTitle ? toPlainText(feedTitle) : null,
    items,
  };
}
