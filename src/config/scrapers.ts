/**
 * Feed sources, vocabulary and relevance thresholds for the resources hub.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  A CHANGE TO THIS FILE IS THE MODERATION ACTION.
 *  Disabling a feed, raising the relevance bar, banning a title pattern —
 *  all live here and ship via PR. There is no admin UI for any of it, on
 *  purpose: every editorial decision should be reviewable and revertible.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Every feed carries a `notes` line explaining why it is on or off. That
 * context is the difference between a maintainable feed list and a mystery
 * six months from now, and it is why disabled feeds stay in this file rather
 * than being deleted.
 *
 * Each URL below was fetched and confirmed to return a parseable feed with
 * items on 2026-08-13. Feeds that failed that check are recorded at the
 * bottom so nobody wastes an afternoon rediscovering them.
 */

import type { Audience, Region, ResourceCategory } from '@/lib/resources/types';

export interface FeedSource {
  /** Stable id — used as the primary key in resource_feed_health. Never renumber. */
  id: string;
  name: string;
  url: string;
  region: Region;
  /** Default category for items from this feed; per-item scoring can override. */
  category: ResourceCategory;
  /** Who this source mainly serves. */
  audience: Audience[];
  enabled: boolean;
  /**
   * Relevance bonus applied to every item from this source. Use sparingly —
   * it is for sources that are reliably on-topic, not for favourites.
   */
  weight?: number;
  notes: string;
}

// ---------------------------------------------------------------------------
// Feeds
// ---------------------------------------------------------------------------

export const FEEDS: FeedSource[] = [
  // ---------------------------------------------------------------- India
  // The India-weighted half is the point. A pure mirror of the global trade
  // press adds nothing a reader cannot get from the source itself; Indian
  // platform, regulatory and agency news is the part nobody aggregates well.
  {
    id: 'et-brandequity',
    name: 'ET BrandEquity',
    url: 'https://brandequity.economictimes.indiatimes.com/rss/topstories',
    region: 'india',
    category: 'industry',
    audience: ['professionals', 'owners'],
    enabled: true,
    weight: 3,
    notes: 'The main Indian marketing trade title. Highest-signal India source; weighted up.',
  },
  {
    id: 'social-samosa',
    name: 'Social Samosa',
    url: 'https://www.socialsamosa.com/rss',
    region: 'india',
    category: 'social',
    audience: ['professionals', 'aspiring'],
    enabled: true,
    weight: 2,
    notes: 'Indian social/digital marketing. Note the URL is /rss — /feed/ 404s.',
  },
  {
    id: 'medianews4u',
    name: 'MediaNews4U',
    url: 'https://www.medianews4u.com/feed/',
    region: 'india',
    category: 'industry',
    audience: ['professionals'],
    enabled: true,
    notes: 'Indian media and advertising trade. Heavy on appointments — the banned patterns thin these out.',
  },
  {
    id: 'inc42',
    name: 'Inc42',
    url: 'https://inc42.com/feed/',
    region: 'india',
    category: 'industry',
    audience: ['owners', 'professionals'],
    enabled: true,
    notes: 'Indian startup coverage. Broad, so relies on keyword scoring to stay on-topic.',
  },
  {
    id: 'yourstory',
    name: 'YourStory',
    url: 'https://yourstory.com/feed',
    region: 'india',
    category: 'industry',
    audience: ['owners'],
    enabled: true,
    notes: 'Indian small-business and startup stories. Same caveat as Inc42 — broad, scored hard.',
  },
  {
    id: 'business-standard-companies',
    name: 'Business Standard',
    url: 'https://www.business-standard.com/rss/companies-101.rss',
    region: 'india',
    category: 'industry',
    audience: ['owners'],
    enabled: false,
    notes:
      'DISABLED. General companies feed, ~35 items/run and only a fraction is marketing. ' +
      'Enable only with a much higher threshold, or it will drown everything else.',
  },

  // --------------------------------------------------------------- Global
  {
    id: 'search-engine-journal',
    name: 'Search Engine Journal',
    url: 'https://www.searchenginejournal.com/feed/',
    region: 'global',
    category: 'search',
    audience: ['professionals', 'aspiring'],
    enabled: true,
    weight: 2,
    notes: 'Reliable SEO/SEM coverage. Search Engine Land 403s any non-browser client, so this covers the beat instead.',
  },
  {
    id: 'marketing-dive',
    name: 'Marketing Dive',
    url: 'https://www.marketingdive.com/feeds/news/',
    region: 'global',
    category: 'industry',
    audience: ['professionals'],
    enabled: true,
    notes: 'Clean, low-noise industry feed. Good excerpts, which matters for a link-and-excerpt hub.',
  },
  {
    id: 'social-media-today',
    name: 'Social Media Today',
    url: 'https://www.socialmediatoday.com/feeds/news/',
    region: 'global',
    category: 'social',
    audience: ['professionals', 'owners'],
    enabled: true,
    notes: 'Platform changes land here first and matter to owners, not just agencies.',
  },
  {
    id: 'adweek',
    name: 'Adweek',
    url: 'https://www.adweek.com/feed/',
    region: 'global',
    category: 'brand',
    audience: ['professionals'],
    enabled: true,
    notes: 'Brand and campaign coverage. US-centric; keep an eye on whether it earns its slot.',
  },
  {
    id: 'moz',
    name: 'Moz',
    url: 'https://moz.com/posts/rss/blog',
    region: 'global',
    category: 'search',
    audience: ['aspiring', 'professionals'],
    enabled: true,
    notes: 'Atom, not RSS — the parser must handle both. Strong teaching content for the learning audience.',
  },
  {
    id: 'ahrefs',
    name: 'Ahrefs',
    url: 'https://ahrefs.com/blog/feed/',
    region: 'global',
    category: 'search',
    audience: ['aspiring', 'professionals'],
    enabled: true,
    notes: 'Long-form and genuinely instructional. Vendor blog, so expect product mentions.',
  },
  {
    id: 'semrush',
    name: 'Semrush',
    url: 'https://www.semrush.com/blog/feed/',
    region: 'global',
    category: 'search',
    audience: ['aspiring', 'owners'],
    enabled: true,
    notes: 'Vendor blog, pitched at beginners — useful for the aspiring audience.',
  },
  {
    id: 'hubspot-marketing',
    name: 'HubSpot',
    url: 'https://blog.hubspot.com/marketing/rss.xml',
    region: 'global',
    category: 'content',
    audience: ['aspiring', 'owners'],
    enabled: true,
    notes: 'Beginner-friendly fundamentals. Vendor blog; heavy CTA density in the source articles.',
  },
  {
    id: 'neil-patel',
    name: 'Neil Patel',
    url: 'https://neilpatel.com/blog/feed/',
    region: 'global',
    category: 'content',
    audience: ['aspiring', 'owners'],
    enabled: false,
    notes:
      'DISABLED pending a quality read. Reliably fetches, but the content is repetitive and ' +
      'heavily self-promotional. Turn on only if the hub looks thin.',
  },

  // ------------------------------------------------------ Platform / first-party
  // First-party announcements are the highest-actionability items in the whole
  // list: when Google or Meta changes something, it changes what readers must
  // actually do. Weighted accordingly.
  {
    id: 'google-search-central',
    name: 'Google Search Central',
    url: 'https://developers.google.com/search/blog/feed.xml',
    region: 'global',
    category: 'search',
    audience: ['professionals', 'owners'],
    enabled: true,
    weight: 4,
    notes: 'Authoritative source for search changes. Low volume, high value — never let this one break.',
  },
  {
    id: 'google-ads-blog',
    name: 'Google Ads',
    url: 'https://blog.google/products/ads-commerce/rss/',
    region: 'global',
    category: 'paid',
    audience: ['professionals', 'owners'],
    enabled: true,
    weight: 4,
    notes: 'First-party ads product announcements.',
  },
  {
    id: 'meta-newsroom',
    name: 'Meta',
    url: 'https://about.fb.com/news/feed/',
    region: 'global',
    category: 'social',
    audience: ['professionals', 'owners'],
    enabled: true,
    // No weight, deliberately. It had 2, and measured against a real run that
    // pushed 7 of 8 items through including "NABTU and Meta Announce New
    // Partnership to Invest In Skilled Trades" — corporate news, not
    // marketing. A newsroom that is only occasionally on-topic must clear the
    // bar on its own vocabulary matches.
    notes:
      'Corporate newsroom — most of it is not marketing. Unweighted on purpose; ' +
      'if it still reads noisy, disable rather than raising the global threshold.',
  },

  // ---------------------------------------------------------- AI / automation
  {
    id: 'openai-news',
    name: 'OpenAI',
    url: 'https://openai.com/news/rss.xml',
    region: 'global',
    category: 'ai_automation',
    audience: ['owners', 'professionals'],
    enabled: true,
    notes:
      'Returns its ENTIRE archive (~650 items) on every fetch, not a recent window. ' +
      'The scraper must cut by publish date or the first run will import years of history.',
  },
];

/**
 * Feeds checked on 2026-08-13 that could not be used, kept so the next person
 * does not rediscover them one at a time.
 *
 *   Search Engine Land      HTTP 403 to any non-browser user-agent
 *   Exchange4media          HTTP 403, both /rss/ and /rss/latest-news.xml
 *   The Drum                answers 202 with a non-feed body (bot challenge)
 *   Content Marketing Inst. 200 but HTML, not a feed
 *   Campaign India          /rss is HTML; /rss/latest-news 404s
 *   afaqs                   returns an RSS envelope containing zero items
 *   Social Samosa /feed/    404 — the working path is /rss (enabled above)
 *   Storyboard18            404 at /feed/
 *   Adgully                 200 but not a feed
 *   Anthropic               no public RSS at /news/rss.xml or /rss.xml
 *   MarketingProfs          404
 *   TikTok Newsroom         503
 *   LinkedIn Marketing Blog 404
 *
 * Several of these publish worth having. Reaching them needs either a
 * browser-like fetch or an intermediary, which is a bigger decision than a
 * feed list — do not paper over it by pretending the URL works.
 */

export function getActiveFeeds(): FeedSource[] {
  return FEEDS.filter((f) => f.enabled);
}

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/**
 * Terms that make an item relevant. Additive by design — removing a term
 * rarely helps, and a term that turns out to be noisy is better handled by
 * raising the threshold than by deleting vocabulary other items rely on.
 *
 * Grouped by category so a match can also classify the item, not just score
 * it. Lowercase; matching is case-insensitive and word-boundary aware, so
 * 'ad' will not fire on 'admin' or 'added'.
 */
export const VOCABULARY: Record<ResourceCategory, string[]> = {
  search: [
    'seo', 'search engine', 'serp', 'google search', 'keyword', 'backlink',
    'core update', 'algorithm update', 'search console', 'organic traffic',
    'featured snippet', 'crawl', 'indexing', 'schema markup', 'local seo',
    'search generative', 'ai overview',
  ],
  social: [
    'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'x corp',
    'threads', 'whatsapp', 'social media', 'creator', 'influencer', 'reels',
    'pinterest', 'snapchat', 'snap inc', 'brand ambassador',
    'shorts', 'community management', 'ugc', 'social commerce',
  ],
  paid: [
    'google ads', 'meta ads', 'ppc', 'cpc', 'cpm', 'roas', 'ad spend',
    'programmatic', 'retail media', 'performance max', 'demand gen',
    'ad campaign', 'bidding', 'ctv', 'connected tv', 'display ads',
    'ad targeting', 'targeting', 'ad tech', 'media buy', 'sponsorship',
  ],
  content: [
    'content marketing', 'copywriting', 'blogging', 'newsletter', 'email marketing',
    'content strategy', 'storytelling', 'video marketing', 'podcast',
    'editorial calendar', 'content calendar',
  ],
  brand: [
    'brand', 'branding', 'rebrand', 'positioning', 'brand identity', 'campaign',
    'advertising', 'creative director', 'brand strategy', 'logo', 'packaging',
  ],
  analytics: [
    'analytics', 'attribution', 'conversion rate', 'ga4', 'first-party data',
    'cdp', 'measurement', 'tracking', 'cookie', 'consent mode', 'dashboard',
    'a/b test', 'experimentation', 'incrementality',
  ],
  ai_automation: [
    'ai', 'artificial intelligence', 'llm', 'chatgpt', 'gpt', 'claude', 'gemini',
    'automation', 'workflow automation', 'generative', 'machine learning',
    'ai agent', 'prompt', 'copilot', 'no-code', 'zapier', 'n8n',
  ],
  industry: [
    'agency', 'marketing', 'marketer', 'cmo', 'martech', 'adtech', 'holdco',
    'media buying', 'pitch win', 'account win', 'd2c', 'ecommerce',
    // Agency networks — "WPP's streamlined strategy" is squarely industry
    // news and matched nothing before these were added.
    'wpp', 'omnicom', 'publicis', 'dentsu', 'havas', 'interpublic', 'ipg',
    'media agency', 'ad agency', 'creative agency',
    'small business', 'startup marketing', 'asci', 'dpdp',
  ],
};

/**
 * Title patterns that disqualify an item outright, regardless of score.
 *
 * These are the shapes that pass keyword scoring while being worthless to a
 * reader: pure PR, promotional filler, and the personnel churn that fills
 * trade feeds. Appointments are the biggest single source of noise in the
 * Indian trade press and are deliberately excluded — a reader wanting them
 * is better served by the source directly.
 */
export const BANNED_TITLE_PATTERNS: RegExp[] = [
  /\bsponsored\b/i,
  /\badvertorial\b/i,
  /\bpartner content\b/i,
  /\bpress release\b/i,
  /\bwebinar\b/i,
  /\bregister (now|today)\b/i,
  /\blast (chance|few days)\b/i,
  /\bnominations? (open|close)/i,
  /\baward(s)? (entry|entries|deadline)/i,
  /\bappoints?\b/i,
  /\bappointed\b/i,
  /\bjoins? as\b/i,
  /\belevates?\b/i,
  // NOTE: no /\bpromotes?\b/ here. It reads like an appointment verb but
  // overwhelmingly appears as ordinary marketing language — it discarded
  // "Gap's fall campaign enlists star to promote denim". The `as (role)`
  // pattern below catches the appointment shape without that collateral.
  // Catches the shape rather than the verb: "X names Y as Senior Director",
  // which the verb list above misses entirely. Deliberately does not allow
  // "as a CMO" — that phrasing belongs to opinion pieces worth keeping.
  /\bas (its |the )?(new |interim |acting )?(ceo|cmo|cfo|coo|cto|chro|chief|head of|senior director|managing director|executive director|creative director|director|president|vice president|vp|country manager|md)\b/i,
  /\bsteps down\b/i,
  /\bresigns?\b/i,
  /\bobituary\b/i,
  /\bhoroscope\b/i,
];

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

export const THRESHOLDS = {
  /**
   * Minimum score for an aggregated news item to be stored.
   *
   * Set to exactly one title hit. Measured against real headlines from these
   * feeds: "Dove's marketing mixes sports and style", "Urban Outfitters ...
   * first CTV commercial" and "Meta outlines updated scam alert system coming
   * to WhatsApp" each contain exactly one vocabulary term in the title and no
   * useful excerpt, and a threshold of 4 discarded all three. Most feeds here
   * supply a title and little else, so requiring two signals silently throws
   * away the majority of genuinely relevant items.
   *
   * This is safe only because `evaluateItem` separately requires at least one
   * vocabulary match — see the note there. Without that gate, a weighted feed
   * would clear this threshold on weight alone.
   */
  MIN_RELEVANCE: 3,
  /** A term in the title is worth this much. */
  TITLE_HIT: 3,
  /** A term in the excerpt is worth this much. */
  EXCERPT_HIT: 1,
  /** Extra weight for India-region sources — the deliberate home-market bias. */
  INDIA_BONUS: 2,
  /** Items older than this are ignored on import. */
  MAX_AGE_DAYS: 30,
  /** Hard cap per feed per run, so one archive-dumping feed cannot flood a run. */
  MAX_ITEMS_PER_FEED: 25,
  /** Consecutive failures before a feed is reported as broken. */
  STALE_FEED_FAILURES: 3,
  /** Days without a new item before a feed is reported as stale. */
  STALE_FEED_DAYS: 21,
} as const;

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

export interface FeedItemInput {
  title: string;
  excerpt?: string;
  publishedAt?: Date | null;
}

export interface Evaluation {
  keep: boolean;
  score: number;
  /** Best-matching category, or the feed default when nothing matched. */
  category: ResourceCategory;
  /** Every term that contributed — makes tuning explainable rather than magic. */
  matched: string[];
  reason?: 'banned_title' | 'too_old' | 'below_threshold';
}

const WORD_BOUNDARY_CACHE = new Map<string, RegExp>();

/**
 * Word-boundary matcher for a vocabulary term, built once per term.
 *
 * Accepts a trailing plural or possessive, because the strict form silently
 * lost real items: "Adobe says brands need a point of view" did not match
 * 'brand', and "Google Ads' new bidding" did not match 'google ads'. The
 * boundary still prevents 'ai' firing on 'said' or 'ad' on 'admin'.
 */
function termRegex(term: string): RegExp {
  let re = WORD_BOUNDARY_CACHE.get(term);
  if (!re) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(`(^|[^a-z0-9])${escaped}(?:'s|\u2019s|s)?([^a-z0-9]|$)`, 'i');
    WORD_BOUNDARY_CACHE.set(term, re);
  }
  return re;
}

/**
 * Score one feed item against the vocabulary and decide whether to keep it.
 *
 * Pure and dependency-free so it can be unit-tested and so `scrape-tune` can
 * run a config change against live feeds before anyone commits it.
 */
export function evaluateItem(item: FeedItemInput, feed: FeedSource): Evaluation {
  const title = item.title || '';
  const excerpt = item.excerpt || '';

  for (const pattern of BANNED_TITLE_PATTERNS) {
    if (pattern.test(title)) {
      return { keep: false, score: 0, category: feed.category, matched: [], reason: 'banned_title' };
    }
  }

  if (item.publishedAt) {
    const ageDays = (Date.now() - item.publishedAt.getTime()) / 86_400_000;
    if (ageDays > THRESHOLDS.MAX_AGE_DAYS) {
      return { keep: false, score: 0, category: feed.category, matched: [], reason: 'too_old' };
    }
  }

  let score = feed.weight ?? 0;
  if (feed.region === 'india') score += THRESHOLDS.INDIA_BONUS;

  const matched: string[] = [];
  const perCategory: Partial<Record<ResourceCategory, number>> = {};

  for (const [category, terms] of Object.entries(VOCABULARY) as [ResourceCategory, string[]][]) {
    for (const term of terms) {
      const re = termRegex(term);
      let hit = 0;
      if (re.test(title)) hit += THRESHOLDS.TITLE_HIT;
      if (excerpt && re.test(excerpt)) hit += THRESHOLDS.EXCERPT_HIT;
      if (hit > 0) {
        score += hit;
        matched.push(term);
        perCategory[category] = (perCategory[category] ?? 0) + hit;
      }
    }
  }

  // Classify by whichever category scored highest; fall back to the feed's
  // default when nothing matched at all.
  const best = (Object.entries(perCategory) as [ResourceCategory, number][])
    .sort((a, b) => b[1] - a[1])[0];

  // Two independent conditions, not one.
  //
  // "Is it about anything we cover?" is a different question from "how
  // strongly?", and collapsing them into a single score lets `weight` and the
  // India bonus manufacture relevance out of nothing: google-search-central
  // carries weight 4, so on score alone every item it published would clear a
  // threshold of 3 or 4 without matching a single vocabulary term.
  const onTopic = matched.length > 0;
  const keep = onTopic && score >= THRESHOLDS.MIN_RELEVANCE;

  return {
    keep,
    score,
    category: best ? best[0] : feed.category,
    matched,
    reason: keep ? undefined : 'below_threshold',
  };
}
