import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parseFeed, decodeEntities } from '../feed-parser';

/**
 * Fixtures are real XML captured from every enabled feed on 2026-08-13.
 * This is what makes a hand-written parser defensible instead of reckless:
 * a publisher whose markup breaks it fails here rather than silently
 * importing nothing in production.
 */
const DIR = join(__dirname, 'fixtures');
const FIXTURES = readdirSync(DIR).filter((f) => f.endsWith('.xml'));
const load = (f: string) => readFileSync(join(DIR, f), 'utf8');

describe('parseFeed against every real feed', () => {
  it('has a fixture for each feed', () => {
    expect(FIXTURES.length).toBeGreaterThanOrEqual(15);
  });

  for (const file of FIXTURES) {
    describe(file.replace('.xml', ''), () => {
      const feed = parseFeed(load(file));

      it('is recognised as RSS or Atom', () => {
        expect(feed.format).not.toBe('unknown');
      });

      it('yields at least one item', () => {
        expect(feed.items.length).toBeGreaterThan(0);
      });

      it('gives every item a title and an absolute link', () => {
        for (const item of feed.items) {
          expect(item.title.length, `empty title in ${file}`).toBeGreaterThan(0);
          expect(item.link, `bad link in ${file}: ${item.link}`).toMatch(/^https?:\/\//);
        }
      });

      it('leaves no markup or raw entities in text fields', () => {
        for (const item of feed.items) {
          expect(item.title, `markup in title: ${item.title}`).not.toMatch(/<[a-z/]/i);
          expect(item.excerpt, `markup in excerpt`).not.toMatch(/<[a-z/]/i);
          // CDATA must be unwrapped, never surfaced.
          expect(item.title + item.excerpt).not.toContain('CDATA');
          // A leftover &amp; or &#39; means decoding missed a case.
          expect(item.title, `undecoded entity: ${item.title}`).not.toMatch(/&(amp|lt|gt|quot|#\d+);/);
        }
      });

      it('parses a usable publish date for most items', () => {
        const dated = feed.items.filter((i) => i.publishedAt instanceof Date);
        expect(dated.length, `no dates parsed in ${file}`).toBeGreaterThan(0);
        for (const i of dated) {
          const year = i.publishedAt!.getUTCFullYear();
          expect(year, `implausible year ${year} in ${file}`).toBeGreaterThan(2015);
        }
      });

      it('keeps excerpts short — this is a link-and-excerpt feed, not a mirror', () => {
        for (const item of feed.items) {
          expect(item.excerpt.length).toBeLessThanOrEqual(325);
        }
      });
    });
  }
});

describe('decodeEntities', () => {
  it('decodes named entities', () => {
    expect(decodeEntities('Tom &amp; Jerry')).toBe('Tom & Jerry');
    expect(decodeEntities('&quot;quoted&quot;')).toBe('"quoted"');
    expect(decodeEntities('a &ndash; b')).toBe('a – b');
  });

  it('decodes decimal and hex numeric entities', () => {
    expect(decodeEntities('It&#39;s')).toBe("It's");
    expect(decodeEntities('It&#x27;s')).toBe("It's");
    expect(decodeEntities('&#8217;')).toBe('’');
  });

  it('does NOT double-decode — the classic bug', () => {
    // &amp;lt; means a literal "&lt;", not "<". Resolving &amp; in a separate
    // earlier pass would wrongly produce "<".
    expect(decodeEntities('&amp;lt;script&amp;gt;')).toBe('&lt;script&gt;');
  });

  it('leaves unknown entities untouched rather than mangling them', () => {
    expect(decodeEntities('&notarealentity;')).toBe('&notarealentity;');
  });

  it('ignores out-of-range code points instead of throwing', () => {
    expect(() => decodeEntities('&#999999999;')).not.toThrow();
  });
});

describe('parser edge cases', () => {
  it('prefers the Atom rel="alternate" link over other rels', () => {
    const xml = `<feed><entry><title>T</title>
      <link rel="edit" href="https://example.com/edit"/>
      <link rel="alternate" href="https://example.com/post"/>
      <updated>2026-08-01T00:00:00Z</updated></entry></feed>`;
    expect(parseFeed(xml).items[0].link).toBe('https://example.com/post');
  });

  it('skips items with no title or no link rather than emitting blank cards', () => {
    const xml = `<rss><channel>
      <item><title>Good</title><link>https://example.com/a</link></item>
      <item><title>No link</title></item>
      <item><link>https://example.com/c</link></item>
    </channel></rss>`;
    const items = parseFeed(xml).items;
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Good');
  });

  it('does not mistake a post title for the channel title', () => {
    const xml = `<rss><channel><title>My Feed</title>
      <item><title>My Post</title><link>https://example.com/a</link></item>
    </channel></rss>`;
    expect(parseFeed(xml).title).toBe('My Feed');
  });

  it('returns empty rather than throwing on junk input', () => {
    expect(parseFeed('<html><body>not a feed</body></html>').items).toEqual([]);
    expect(parseFeed('').items).toEqual([]);
  });
});
