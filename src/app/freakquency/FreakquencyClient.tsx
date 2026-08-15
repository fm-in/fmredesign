'use client';

/**
 * Freakquency — interaction layer.
 *
 * Filters across four dimensions plus search. Counts on every option are
 * FACETED: each is computed against the set filtered by all the OTHER active
 * dimensions, not against the whole feed. That means a number on a chip is a
 * promise — clicking it yields exactly that many items — so no combination
 * ever leads to an empty screen you could have predicted was empty.
 */

import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Clock, Search, X } from 'lucide-react';
import type { FeedItem } from '@/lib/resources/public-data';
import type { Audience, Region, ResourceCategory } from '@/lib/resources/types';
import { CATEGORY_LABELS, RESOURCE_TYPE_LABELS } from '@/lib/resources/types';

type Intent = Audience | 'all';
type Topic = ResourceCategory | 'all';
type Place = Region | 'all';
type SortKey = 'newest' | 'relevant';

interface Filters {
  intent: Intent;
  topic: Topic;
  region: Place;
  /** Max age in days; null means no limit. */
  days: number | null;
  q: string;
}

const EMPTY: Filters = { intent: 'all', topic: 'all', region: 'all', days: null, q: '' };

const INTENTS: { key: Intent; label: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'professionals', label: 'Latest' },
  { key: 'aspiring', label: 'Learn' },
  { key: 'owners', label: 'For your business' },
];

const PLACES: { key: Place; label: string }[] = [
  { key: 'all', label: 'Everywhere' },
  { key: 'india', label: 'India' },
  { key: 'global', label: 'Global' },
];

const WINDOWS: { key: number | null; label: string }[] = [
  { key: 1, label: 'Today' },
  { key: 7, label: 'This week' },
  { key: 30, label: 'This month' },
  { key: null, label: 'All time' },
];

/** Which dimension to ignore when computing a facet count. */
type Dim = 'intent' | 'topic' | 'region' | 'days' | null;

function matches(item: FeedItem, f: Filters, skip: Dim = null): boolean {
  if (skip !== 'intent' && f.intent !== 'all' && !item.audience.includes(f.intent)) return false;
  if (skip !== 'topic' && f.topic !== 'all' && item.category !== f.topic) return false;
  if (skip !== 'region' && f.region !== 'all' && item.region !== f.region) return false;
  if (skip !== 'days' && f.days !== null) {
    const ageDays = (Date.now() - Date.parse(item.publishedAt)) / 86_400_000;
    if (ageDays > f.days) return false;
  }
  const q = f.q.trim().toLowerCase();
  if (q) {
    const hay = `${item.title} ${item.excerpt} ${item.sourceName ?? ''}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

/** Relative age. Absolute dates make a live feed look stale even when it is not. */
function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PAGE_SIZE = 24;

function Chip({
  active, label, count, onClick,
}: { active: boolean; label: string; count?: number; onClick: () => void }) {
  // A zero-count option is left visible but disabled: hiding options as you
  // filter makes the control shift under the cursor and hides what exists.
  const dead = count === 0 && !active;
  return (
    <button
      onClick={onClick}
      disabled={dead}
      className={[
        'px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap',
        active
          ? 'bg-fm-magenta-600 text-white border-fm-magenta-600'
          : dead
            ? 'bg-white/50 text-fm-neutral-300 border-fm-neutral-100 cursor-not-allowed'
            : 'bg-white text-fm-neutral-700 border-fm-neutral-200 hover:border-fm-magenta-300',
      ].join(' ')}
    >
      {label}
      {count !== undefined && (
        <span className={active ? 'text-white/70 ml-1.5' : 'text-fm-neutral-400 ml-1.5'}>{count}</span>
      )}
    </button>
  );
}

export default function FreakquencyClient({ items }: { items: FeedItem[] }) {
  const [f, setF] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState<SortKey>('newest');
  const [shown, setShown] = useState(PAGE_SIZE);

  const set = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setF((prev) => ({ ...prev, [key]: value }));
    setShown(PAGE_SIZE);
  }, []);

  const filtered = useMemo(() => {
    const out = items.filter((i) => matches(i, f));
    return sort === 'relevant'
      ? [...out].sort((a, b) => b.relevanceScore - a.relevanceScore || Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
      : out;
  }, [items, f, sort]);

  /** Counts for one dimension, measured with that dimension released. */
  const facet = useCallback(
    (dim: Exclude<Dim, null>) => items.filter((i) => matches(i, f, dim)),
    [items, f]
  );

  const intentCounts = useMemo(() => {
    const pool = facet('intent');
    return {
      all: pool.length,
      professionals: pool.filter((i) => i.audience.includes('professionals')).length,
      aspiring: pool.filter((i) => i.audience.includes('aspiring')).length,
      owners: pool.filter((i) => i.audience.includes('owners')).length,
    } as Record<Intent, number>;
  }, [facet]);

  const topicCounts = useMemo(() => {
    const pool = facet('topic');
    const out: Record<string, number> = { all: pool.length };
    for (const i of pool) if (i.category) out[i.category] = (out[i.category] ?? 0) + 1;
    return out;
  }, [facet]);

  const regionCounts = useMemo(() => {
    const pool = facet('region');
    return {
      all: pool.length,
      india: pool.filter((i) => i.region === 'india').length,
      global: pool.filter((i) => i.region === 'global').length,
    } as Record<Place, number>;
  }, [facet]);

  // Topics present in the data, busiest first — the config has eight
  // categories but only what actually arrived is worth offering.
  const topics = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const i of items) if (i.category) counts[i.category] = (counts[i.category] ?? 0) + 1;
    return (Object.keys(counts) as ResourceCategory[]).sort((a, b) => counts[b] - counts[a]);
  }, [items]);

  const activeCount =
    (f.intent !== 'all' ? 1 : 0) + (f.topic !== 'all' ? 1 : 0) +
    (f.region !== 'all' ? 1 : 0) + (f.days !== null ? 1 : 0) + (f.q.trim() ? 1 : 0);

  const featured = useMemo(() => filtered.find((i) => !i.external) ?? filtered[0], [filtered]);
  const rest = useMemo(
    () => filtered.filter((i) => i.id !== featured?.id).slice(0, shown),
    [filtered, featured, shown]
  );

  return (
    <div className="v2-container v2-container-wide v2-section">
      <div className="max-w-3xl mx-auto" style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div className="v2-badge v2-badge-glass mb-6 inline-flex">
          <span className="v2-text-primary">Updated every two hours</span>
        </div>
        <h1 className="font-display text-4xl md:text-6xl font-bold v2-text-primary mb-6 leading-tight">
          Freak<span className="v2-accent">quency</span>
        </h1>
        <p className="text-lg md:text-xl v2-text-secondary leading-relaxed">
          What actually happened in marketing, filtered — plus the guides and tools for
          people who have to do something about it.
        </p>
      </div>

      {/* ------------------------------------------------------------ filters */}
      <div className="v2-paper rounded-3xl p-4 md:p-6 mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-fm-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={f.q}
              onChange={(e) => set('q', e.target.value)}
              placeholder="Search titles, summaries and sources…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-fm-neutral-200 bg-white text-fm-neutral-900 text-sm focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort order"
            className="px-3 py-2.5 rounded-lg border border-fm-neutral-200 bg-white text-fm-neutral-900 text-sm sm:w-44"
          >
            <option value="newest">Newest first</option>
            <option value="relevant">Most relevant</option>
          </select>
        </div>

        <Row label="Read as">
          {INTENTS.map((i) => (
            <Chip key={i.key} label={i.label} count={intentCounts[i.key]}
              active={f.intent === i.key} onClick={() => set('intent', i.key)} />
          ))}
        </Row>

        <Row label="Topic">
          <Chip label="All topics" count={topicCounts.all} active={f.topic === 'all'} onClick={() => set('topic', 'all')} />
          {topics.map((t) => (
            <Chip key={t} label={CATEGORY_LABELS[t] ?? t} count={topicCounts[t] ?? 0}
              active={f.topic === t} onClick={() => set('topic', t)} />
          ))}
        </Row>

        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 pt-1">
          <Row label="Region" tight>
            {PLACES.map((p) => (
              <Chip key={String(p.key)} label={p.label} count={regionCounts[p.key]}
                active={f.region === p.key} onClick={() => set('region', p.key)} />
            ))}
          </Row>
          <Row label="When" tight>
            {WINDOWS.map((w) => (
              <Chip key={String(w.key)} label={w.label}
                active={f.days === w.key} onClick={() => set('days', w.key)} />
            ))}
          </Row>
          {activeCount > 0 && (
            <button
              onClick={() => { setF(EMPTY); setShown(PAGE_SIZE); }}
              className="md:ml-auto inline-flex items-center gap-1.5 text-sm text-fm-magenta-600 hover:text-fm-magenta-700 font-medium whitespace-nowrap"
            >
              <X className="w-4 h-4" /> Clear {activeCount} filter{activeCount > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      <p className="text-sm v2-text-tertiary mb-4" style={{ textAlign: 'center' }}>
        {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
      </p>

      {filtered.length === 0 ? (
        <div className="v2-paper rounded-3xl p-12" style={{ textAlign: 'center' }}>
          <p className="text-fm-neutral-700 font-medium mb-1">Nothing matches all of that.</p>
          <p className="text-sm text-fm-neutral-500 mb-5">
            Every count above is measured against your other filters, so widening any one of
            them will bring results back.
          </p>
          <button onClick={() => { setF(EMPTY); setShown(PAGE_SIZE); }} className="v2-btn v2-btn-magenta">
            Clear all filters
          </button>
        </div>
      ) : (
        <>
          {featured && <FeaturedCard item={featured} />}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
            {rest.map((item) => <Card key={item.id} item={item} />)}
          </div>
          {rest.length + 1 < filtered.length && (
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <button onClick={() => setShown((n) => n + PAGE_SIZE)} className="v2-btn v2-btn-secondary">
                Show more ({filtered.length - rest.length - 1} left)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** A labelled row of chips that scrolls rather than wrapping into a wall. */
function Row({ label, children, tight = false }: { label: string; children: React.ReactNode; tight?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${tight ? '' : 'w-full'}`}>
      <span className="text-xs uppercase tracking-wide text-fm-neutral-400 w-14 shrink-0">{label}</span>
      <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">{children}</div>
    </div>
  );
}

/**
 * Card artwork.
 *
 * Plain <img>, not next/image, on purpose. These come from arbitrary
 * publisher CDNs — measured so far: img-cdn.publive.online, etimg.etb2bimg.com,
 * inc42.com, storage.googleapis.com, and whatever each og:image resolves to.
 * next/image would need every one allowlisted in remotePatterns, and the only
 * way to avoid maintaining that list forever is hostname '**', which turns the
 * image optimiser into an open proxy for any URL on the internet. Publisher
 * artwork is already CDN-optimised, so the loss is small and the risk is zero.
 */
function Thumb({ item, tall = false }: { item: FeedItem; tall?: boolean }) {
  const [broken, setBroken] = useState(false);
  const showImage = item.imageUrl && !broken;

  return (
    <div
      className={`relative overflow-hidden bg-fm-neutral-100 ${tall ? 'aspect-[16/10]' : 'aspect-[16/9]'}`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- see note above
        <img
          src={item.imageUrl as string}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        // Roughly a quarter of items have no artwork anywhere — Marketing Dive,
        // Social Media Today and Adweek publish neither. A tinted panel with the
        // publisher mark reads as deliberate; a gap reads as broken.
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-fm-magenta-50 via-white to-fm-neutral-100">
          {item.sourceLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- see note above
            <img src={item.sourceLogoUrl} alt="" width={28} height={28} loading="lazy" className="opacity-60" />
          ) : (
            <span className="font-display text-2xl font-bold text-fm-magenta-600/30">FM</span>
          )}
        </div>
      )}
    </div>
  );
}

/** Publisher mark beside the source name, so a card shows where it leads. */
function SourceMark({ item }: { item: FeedItem }) {
  const [broken, setBroken] = useState(false);
  if (!item.sourceLogoUrl || broken) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- see Thumb
    <img
      src={item.sourceLogoUrl}
      alt=""
      width={14}
      height={14}
      loading="lazy"
      onError={() => setBroken(true)}
      className="inline-block rounded-sm shrink-0"
    />
  );
}

/** Shared chrome so the two card shapes stay visually related. */
function Meta({ item }: { item: FeedItem }) {
  return (
    <div className="flex items-center gap-2 text-xs text-fm-neutral-500 flex-wrap">
      <span className="px-2 py-0.5 rounded-full bg-fm-magenta-50 text-fm-magenta-700 font-medium">
        {RESOURCE_TYPE_LABELS[item.type] ?? item.type}
      </span>
      {item.sourceName && (
        <span className="inline-flex items-center gap-1.5">
          <SourceMark item={item} />
          {item.sourceName}
        </span>
      )}
      {item.category && <span>· {CATEGORY_LABELS[item.category] ?? item.category}</span>}
      <span>· {timeAgo(item.publishedAt)}</span>
      {item.readMinutes ? (
        <span className="inline-flex items-center gap-1">
          · <Clock className="w-3 h-3" /> {item.readMinutes} min
        </span>
      ) : null}
    </div>
  );
}

function FeaturedCard({ item }: { item: FeedItem }) {
  const Wrapper = item.external ? 'a' : Link;
  const props = item.external
    ? { href: item.href, target: '_blank', rel: 'noopener noreferrer' }
    : { href: item.href };

  return (
    <Wrapper {...props} className="block group">
      <article className="v2-paper rounded-3xl overflow-hidden md:flex">
        <div className="md:w-2/5">
          <Thumb item={item} tall />
        </div>
        <div className="p-6 md:p-8 flex flex-col justify-center md:w-3/5">
          <Meta item={item} />
          <h2 className="font-display text-2xl md:text-3xl font-bold text-fm-neutral-900 mt-3 mb-3 leading-snug group-hover:text-fm-magenta-700 transition-colors">
            {item.title}
            {item.external && <ArrowUpRight className="inline w-5 h-5 ml-1 text-fm-neutral-400" />}
          </h2>
          {item.excerpt && (
            <p className="text-fm-neutral-600 leading-relaxed line-clamp-3">{item.excerpt}</p>
          )}
        </div>
      </article>
    </Wrapper>
  );
}

function Card({ item }: { item: FeedItem }) {
  const Wrapper = item.external ? 'a' : Link;
  const props = item.external
    ? { href: item.href, target: '_blank', rel: 'noopener noreferrer' }
    : { href: item.href };

  return (
    <Wrapper {...props} className="block group h-full">
      <article className="v2-paper rounded-2xl overflow-hidden h-full flex flex-col hover:-translate-y-0.5 transition-transform">
        <Thumb item={item} />
        <div className="p-5 flex flex-col flex-1">
        <Meta item={item} />
        <h3 className="font-display text-lg font-bold text-fm-neutral-900 mt-3 mb-2 leading-snug group-hover:text-fm-magenta-700 transition-colors">
          {item.title}
          {item.external && <ArrowUpRight className="inline w-4 h-4 ml-1 text-fm-neutral-400 shrink-0" />}
        </h3>
        {item.excerpt && (
          <p className="text-sm text-fm-neutral-600 leading-relaxed line-clamp-3">{item.excerpt}</p>
        )}
        </div>
      </article>
    </Wrapper>
  );
}
