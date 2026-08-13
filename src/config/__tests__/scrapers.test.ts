import { describe, it, expect } from 'vitest';
import {
  FEEDS,
  getActiveFeeds,
  evaluateItem,
  VOCABULARY,
  BANNED_TITLE_PATTERNS,
  THRESHOLDS,
  type FeedSource,
} from '@/config/scrapers';

/**
 * The items below are REAL headlines pulled from the live feeds on
 * 2026-08-13. Keeping them here means a future tweak to the vocabulary or
 * thresholds has to stay compatible with traffic these feeds actually
 * produce, rather than with headlines we imagined.
 */
const feed = (id: string): FeedSource => {
  const f = FEEDS.find((x) => x.id === id);
  if (!f) throw new Error(`fixture references unknown feed: ${id}`);
  return f;
};

const KEEP: Array<{ feed: string; title: string; excerpt?: string }> = [
  { feed: 'search-engine-journal', title: 'How Do I Know If AI Overviews Are Taking Clicks From My Site And What Can I Do About It?' },
  { feed: 'marketing-dive', title: 'Dove’s marketing mixes sports and style for US Open sponsorship return' },
  { feed: 'marketing-dive', title: 'How Cava outperforms in fast casual despite frugal marketing budget' },
  { feed: 'marketing-dive', title: 'Urban Outfitters embraces campus life in first CTV commercial' },
  { feed: 'social-media-today', title: 'YouTube expands access to its in-app AI chatbot' },
  { feed: 'social-media-today', title: 'Meta outlines updated scam alert system coming to WhatsApp' },
  { feed: 'google-search-central', title: 'See how content from social and video platforms performs on Google Search' },
];

const REJECT_OFF_TOPIC: Array<{ feed: string; title: string }> = [
  { feed: 'yourstory', title: '5 Books that reveal the meaning of true independence' },
  { feed: 'inc42', title: 'Awfis Q1 Profit More Than Doubles To ₹24 Cr, Revenue Up 27% YoY' },
  { feed: 'inc42', title: 'Navi To File For ₹3,000 Cr IPO By December: Report' },
  { feed: 'yourstory', title: 'Tata Trusts initiates process of selecting Tata Sons Chairman' },
];

const REJECT_BANNED: Array<{ feed: string; title: string }> = [
  { feed: 'social-samosa', title: 'Pocket Aces elevates Vinay Pillai as CEO' },
  { feed: 'medianews4u', title: 'Godrej Industries appoints Pirojsha Godrej as Executive Chairperson; to lead Group from August 14' },
  { feed: 'social-samosa', title: 'Omnicom Media’s Fuse names Freddy Farhat as Senior Director - Sports Partnerships' },
  { feed: 'search-engine-journal', title: 'AI Overviews: How Freshpet Stands Out in SEO & GEO [Webinar]' },
];

describe('feed configuration integrity', () => {
  it('has unique feed ids', () => {
    const ids = FEEDS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every feed a note explaining why it is on or off', () => {
    // The note is the whole point — without it a feed list becomes a mystery.
    for (const f of FEEDS) {
      expect(f.notes.length, `${f.id} has no note`).toBeGreaterThan(20);
    }
  });

  it('records why each disabled feed is disabled', () => {
    for (const f of FEEDS.filter((x) => !x.enabled)) {
      expect(f.notes.toUpperCase(), `${f.id}`).toContain('DISABLED');
    }
  });

  it('uses https everywhere', () => {
    for (const f of FEEDS) expect(f.url.startsWith('https://'), f.id).toBe(true);
  });

  it('keeps the active list small enough to stay curated', () => {
    // Ten good feeds beat thirty noisy ones.
    expect(getActiveFeeds().length).toBeLessThanOrEqual(20);
    expect(getActiveFeeds().length).toBeGreaterThan(0);
  });

  it('keeps a meaningful India presence — the aggregation is only useful if it is not a mirror of the global press', () => {
    const india = getActiveFeeds().filter((f) => f.region === 'india');
    expect(india.length).toBeGreaterThanOrEqual(3);
  });

  it('has no empty vocabulary category', () => {
    for (const [cat, terms] of Object.entries(VOCABULARY)) {
      expect(terms.length, `${cat} is empty`).toBeGreaterThan(0);
    }
  });

  it('keeps vocabulary lowercase so matching stays predictable', () => {
    for (const [cat, terms] of Object.entries(VOCABULARY)) {
      for (const t of terms) expect(t, `${cat}: ${t}`).toBe(t.toLowerCase());
    }
  });
});

describe('evaluateItem — real headlines that must be kept', () => {
  for (const item of KEEP) {
    it(`keeps: ${item.title.slice(0, 60)}`, () => {
      const e = evaluateItem({ title: item.title, excerpt: item.excerpt }, feed(item.feed));
      expect(e.keep, `scored ${e.score}, matched [${e.matched}]`).toBe(true);
    });
  }
});

describe('evaluateItem — real headlines that must be rejected', () => {
  for (const item of REJECT_OFF_TOPIC) {
    it(`rejects as off-topic: ${item.title.slice(0, 55)}`, () => {
      const e = evaluateItem({ title: item.title }, feed(item.feed));
      expect(e.keep, `scored ${e.score}, matched [${e.matched}]`).toBe(false);
    });
  }

  for (const item of REJECT_BANNED) {
    it(`rejects as banned: ${item.title.slice(0, 55)}`, () => {
      const e = evaluateItem({ title: item.title }, feed(item.feed));
      expect(e.keep).toBe(false);
      expect(e.reason).toBe('banned_title');
    });
  }
});

describe('evaluateItem — mechanics', () => {
  const f = feed('marketing-dive');

  it('does not fire on a substring of a longer word', () => {
    // 'ai' must not match 'said', 'ad' must not match 'admin'.
    const e = evaluateItem({ title: 'She said the admin had already added it' }, f);
    expect(e.matched).not.toContain('ai');
    expect(e.keep).toBe(false);
  });

  it('weights a title hit above an excerpt hit', () => {
    const inTitle = evaluateItem({ title: 'A guide to programmatic' }, f).score;
    const inExcerpt = evaluateItem({ title: 'A guide', excerpt: 'about programmatic' }, f).score;
    expect(inTitle).toBeGreaterThan(inExcerpt);
  });

  it('rejects an item older than the age limit even when relevant', () => {
    const old = new Date(Date.now() - (THRESHOLDS.MAX_AGE_DAYS + 1) * 86_400_000);
    const e = evaluateItem({ title: 'Google Ads launches new bidding for programmatic', publishedAt: old }, f);
    expect(e.keep).toBe(false);
    expect(e.reason).toBe('too_old');
  });

  it('gives India sources the home-market bonus', () => {
    const title = 'Brand campaign spending rises';
    const indian = evaluateItem({ title }, feed('et-brandequity')).score;
    const global = evaluateItem({ title }, feed('adweek')).score;
    expect(indian).toBeGreaterThan(global);
  });

  it('classifies by the strongest matching category, not the feed default', () => {
    // marketing-dive defaults to 'industry'; an SEO headline should override.
    const e = evaluateItem({ title: 'Google core update reshuffles SERP and organic traffic' }, f);
    expect(e.category).toBe('search');
  });

  it('falls back to the feed category when nothing matches', () => {
    expect(evaluateItem({ title: 'Weather is nice today' }, f).category).toBe(f.category);
  });

  it('explains itself — every kept item lists the terms that earned it', () => {
    const e = evaluateItem({ title: 'New attribution model for ad spend' }, f);
    expect(e.matched.length).toBeGreaterThan(0);
  });

  it('never keeps an item on feed weight alone', () => {
    // google-search-central carries weight 4. Before the on-topic gate existed
    // that alone cleared the threshold, so every item it published would have
    // been imported regardless of subject.
    const heavy = feed('google-search-central');
    expect(heavy.weight).toBeGreaterThanOrEqual(THRESHOLDS.MIN_RELEVANCE);
    const e = evaluateItem({ title: 'Our office will be closed on Monday' }, heavy);
    expect(e.matched).toHaveLength(0);
    expect(e.keep).toBe(false);
  });

  it('never keeps an India item on the home-market bonus alone', () => {
    const e = evaluateItem({ title: 'Monsoon arrives early this year' }, feed('et-brandequity'));
    expect(e.matched).toHaveLength(0);
    expect(e.keep).toBe(false);
  });

  it('keeps an item with a single title hit and no excerpt', () => {
    // The common shape in these feeds. A threshold of 4 discarded all of them.
    const e = evaluateItem({ title: 'Urban Outfitters embraces campus life in first CTV commercial' }, feed('marketing-dive'));
    expect(e.keep).toBe(true);
  });

  it('has no banned pattern that matches an empty string', () => {
    for (const p of BANNED_TITLE_PATTERNS) expect(p.test(''), String(p)).toBe(false);
  });
});
