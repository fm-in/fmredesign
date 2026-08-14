/**
 * Feed ingestion — fetch, score, store.
 *
 * Server-only. Runs from the Inngest cron in production and from
 * /api/admin/resources/scrape for tuning, where `dryRun` reports exactly what
 * would be kept and dropped without writing anything. Tune against a dry run
 * before committing a change to src/config/scrapers.ts.
 */

import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveFeeds, evaluateItem, THRESHOLDS, type FeedSource } from '@/config/scrapers';
import { parseFeed, type ParsedFeedItem } from './feed-parser';

const USER_AGENT = 'FreakingMindsBot/1.0 (+https://www.freakingminds.in)';
const FETCH_TIMEOUT_MS = 20_000;

export interface DroppedItem {
  title: string;
  reason: string;
  score: number;
}

export interface FeedReport {
  feedId: string;
  feedName: string;
  ok: boolean;
  error?: string;
  fetched: number;
  kept: number;
  skippedExisting: number;
  dropped: DroppedItem[];
  keptTitles: string[];
}

export interface IngestReport {
  dryRun: boolean;
  feeds: FeedReport[];
  totals: { fetched: number; kept: number; dropped: number; failed: number };
}

/** Fetch one feed. Never throws — a dead publisher must not stop the run. */
async function fetchFeed(feed: FeedSource): Promise<{ xml?: string; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
      signal: controller.signal,
      // Always hit the origin; a cached feed defeats the point of scheduling.
      cache: 'no-store',
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return { xml: await res.text() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'fetch failed' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Stable id derived from the URL.
 *
 * `source_url` carries the unique index and is what upserts conflict on; this
 * only needs to be deterministic so a re-run reuses the same row rather than
 * accumulating duplicates under fresh random ids.
 */
function idForUrl(url: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i++) {
    h = (h << 5) - h + url.charCodeAt(i);
    h |= 0;
  }
  return `res_${Math.abs(h).toString(36)}_${url.length.toString(36)}`;
}

/** Strip tracking parameters so the same article is one row, not five. */
export function canonicaliseUrl(raw: string): string {
  try {
    const u = new URL(raw);
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_|ref$|source$)/i.test(key)) u.searchParams.delete(key);
    }
    u.hash = '';
    return u.toString();
  } catch {
    return raw;
  }
}

function toRow(item: ParsedFeedItem, feed: FeedSource, category: string, score: number) {
  const url = canonicaliseUrl(item.link);
  return {
    id: idForUrl(url),
    type: 'news',
    slug: null,
    title: item.title.slice(0, 300),
    excerpt: item.excerpt || null,
    body_html: null,
    source_url: url,
    source_name: feed.name,
    category,
    tags: [],
    audience: feed.audience,
    region: feed.region,
    status: 'published',
    relevance_score: score,
    cover_image_url: item.imageUrl,
    published_at: (item.publishedAt ?? new Date()).toISOString(),
    scraped_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function ingestFeeds(options: { dryRun?: boolean } = {}): Promise<IngestReport> {
  const dryRun = options.dryRun ?? false;
  const feeds = getActiveFeeds();
  const reports: FeedReport[] = [];

  // Sequential on purpose. Seventeen publishers hit simultaneously from one IP
  // every two hours is how a scraper gets blocked, and this is not latency
  // sensitive — it runs on a schedule with nobody waiting.
  for (const feed of feeds) {
    const report: FeedReport = {
      feedId: feed.id, feedName: feed.name, ok: false,
      fetched: 0, kept: 0, skippedExisting: 0, dropped: [], keptTitles: [],
    };

    const { xml, error } = await fetchFeed(feed);
    if (error || !xml) {
      report.error = error || 'empty response';
      reports.push(report);
      if (!dryRun) await recordHealth(feed.id, { ok: false, error: report.error, items: 0 });
      continue;
    }

    const parsed = parseFeed(xml);
    report.ok = true;
    report.fetched = parsed.items.length;

    const rows: ReturnType<typeof toRow>[] = [];
    for (const item of parsed.items.slice(0, THRESHOLDS.MAX_ITEMS_PER_FEED)) {
      const verdict = evaluateItem(
        { title: item.title, excerpt: item.excerpt, publishedAt: item.publishedAt },
        feed
      );
      if (!verdict.keep) {
        report.dropped.push({ title: item.title, reason: verdict.reason ?? 'below_threshold', score: verdict.score });
        continue;
      }
      rows.push(toRow(item, feed, verdict.category, verdict.score));
      report.keptTitles.push(item.title);
    }
    report.kept = rows.length;

    if (!dryRun && rows.length) {
      const supabase = getSupabaseAdmin();
      // Conflict on source_url, not id: the same article syndicated under a
      // different id must not create a second card.
      const { error: upsertErr } = await supabase
        .from('resources')
        .upsert(rows, { onConflict: 'source_url', ignoreDuplicates: true });
      if (upsertErr) {
        report.ok = false;
        report.error = upsertErr.message;
        report.kept = 0;
      }
    }

    if (!dryRun) {
      await recordHealth(feed.id, {
        ok: report.ok,
        error: report.error,
        items: report.kept,
        lastItemAt: parsed.items[0]?.publishedAt ?? null,
      });
    }

    reports.push(report);
  }

  return {
    dryRun,
    feeds: reports,
    totals: {
      fetched: reports.reduce((n, r) => n + r.fetched, 0),
      kept: reports.reduce((n, r) => n + r.kept, 0),
      dropped: reports.reduce((n, r) => n + r.dropped.length, 0),
      failed: reports.filter((r) => !r.ok).length,
    },
  };
}

/**
 * Record whether a feed answered.
 *
 * A feed that dies quietly is the characteristic failure of an aggregator:
 * the site keeps working with progressively less in it and nobody notices for
 * months. Never throws — losing health telemetry must not fail an otherwise
 * good run.
 */
async function recordHealth(
  feedId: string,
  result: { ok: boolean; error?: string; items: number; lastItemAt?: Date | null }
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from('resource_feed_health')
      .select('consecutive_failures')
      .eq('feed_id', feedId)
      .maybeSingle();

    const failures = result.ok ? 0 : ((existing?.consecutive_failures as number) ?? 0) + 1;

    await supabase.from('resource_feed_health').upsert(
      {
        feed_id: feedId,
        last_checked_at: now,
        last_success_at: result.ok ? now : undefined,
        last_item_at: result.lastItemAt ? result.lastItemAt.toISOString() : undefined,
        consecutive_failures: failures,
        last_error: result.error ?? null,
        items_last_run: result.items,
        updated_at: now,
      },
      { onConflict: 'feed_id' }
    );
  } catch (err) {
    console.error(`[ingest] could not record health for ${feedId}:`, err);
  }
}
