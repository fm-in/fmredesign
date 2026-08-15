'use client';

/**
 * Freakquency — interaction layer.
 *
 * The first version put four filter dimensions inline above the feed: 29
 * interactive controls and 0.85 screens of scroll before the first headline.
 * That is a faceted-search UI, and this is a feed — the overwhelming majority
 * of visitors scan rather than configure, so the top of the page was
 * optimised for the minority.
 *
 * Now: ONE axis inline (the stream bar, which sticks so it stays reachable
 * anywhere in a 172-item list), everything else behind a single Filters
 * control. Two clicks for the few who refine, no cost for everyone else.
 *
 * Counts everywhere remain FACETED — each is computed against the set
 * filtered by all the OTHER active dimensions, so a number on a control is a
 * promise that clicking it yields exactly that many items.
 */

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Clock, Search, SlidersHorizontal, X } from 'lucide-react';
import type { FeedItem } from '@/lib/resources/public-data';
import type { Audience, Region, ResourceCategory } from '@/lib/resources/types';
import { CATEGORY_LABELS, RESOURCE_TYPE_LABELS } from '@/lib/resources/types';

/** The single inline axis: everything, our own writing, or one topic. */
type Stream = 'all' | 'guides' | ResourceCategory;
type Intent = Audience | 'all';
type Place = Region | 'all';
type SortKey = 'newest' | 'relevant';

interface Filters {
  stream: Stream;
  intent: Intent;
  region: Place;
  /** Max age in days; null means no limit. */
  days: number | null;
  q: string;
}

const EMPTY: Filters = { stream: 'all', intent: 'all', region: 'all', days: null, q: '' };

const INTENTS: { key: Intent; label: string }[] = [
  { key: 'all', label: 'Anyone' },
  { key: 'professionals', label: 'Marketers' },
  { key: 'aspiring', label: 'People learning' },
  { key: 'owners', label: 'Business owners' },
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

type Dim = 'stream' | 'intent' | 'region' | 'days' | null;

function matchesStream(item: FeedItem, stream: Stream): boolean {
  if (stream === 'all') return true;
  if (stream === 'guides') return !item.external;
  return item.category === stream;
}

function matches(item: FeedItem, f: Filters, skip: Dim = null): boolean {
  if (skip !== 'stream' && !matchesStream(item, f.stream)) return false;
  if (skip !== 'intent' && f.intent !== 'all' && !item.audience.includes(f.intent)) return false;
  if (skip !== 'region' && f.region !== 'all' && item.region !== f.region) return false;
  if (skip !== 'days' && f.days !== null) {
    if ((Date.now() - Date.parse(item.publishedAt)) / 86_400_000 > f.days) return false;
  }
  const q = f.q.trim().toLowerCase();
  if (q && !`${item.title} ${item.excerpt} ${item.sourceName ?? ''}`.toLowerCase().includes(q)) return false;
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

/**
 * Which edges of a horizontal scroller still have content beyond them.
 *
 * Drives the fade masks, so the row never dims a side that has nothing
 * hidden behind it — a permanent fade on the left would just look like the
 * first chip is broken.
 */
function useEdgeFade() {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ left: el.scrollLeft > 4, right: max > 4 && el.scrollLeft < max - 4 });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', measure, { passive: true });
    // Chip labels carry counts that change with filtering, so the row's
    // scrollWidth changes without any scroll or window resize happening.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', measure);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  const fadeClass =
    edges.left && edges.right ? 'fade-edge-lr' : edges.right ? 'fade-edge-r' : edges.left ? 'fade-edge-l' : '';

  return { ref, fadeClass };
}

const PAGE_SIZE = 24;

function Pill({
  active, label, count, onClick, subtle = false,
}: { active: boolean; label: string; count?: number; onClick: () => void; subtle?: boolean }) {
  // Zero-count options stay visible but disabled. Hiding them as you filter
  // makes the control shift under the cursor and conceals what exists.
  const dead = count === 0 && !active;
  return (
    <button
      onClick={onClick}
      disabled={dead}
      className={[
        'rounded-full text-sm font-medium border transition-colors whitespace-nowrap',
        subtle ? 'px-3 py-1.5' : 'px-4 py-2',
        active
          ? 'bg-fm-magenta-600 text-white border-fm-magenta-600'
          : dead
            ? 'bg-white/40 text-fm-neutral-300 border-fm-neutral-100 cursor-not-allowed'
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
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const streamScroller = useEdgeFade();

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

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

  const facet = useCallback(
    (dim: Exclude<Dim, null>) => items.filter((i) => matches(i, f, dim)),
    [items, f]
  );

  const streamCounts = useMemo(() => {
    const pool = facet('stream');
    const out: Record<string, number> = {
      all: pool.length,
      guides: pool.filter((i) => !i.external).length,
    };
    for (const i of pool) if (i.category) out[i.category] = (out[i.category] ?? 0) + 1;
    return out;
  }, [facet]);

  const intentCounts = useMemo(() => {
    const pool = facet('intent');
    return {
      all: pool.length,
      professionals: pool.filter((i) => i.audience.includes('professionals')).length,
      aspiring: pool.filter((i) => i.audience.includes('aspiring')).length,
      owners: pool.filter((i) => i.audience.includes('owners')).length,
    } as Record<Intent, number>;
  }, [facet]);

  const regionCounts = useMemo(() => {
    const pool = facet('region');
    return {
      all: pool.length,
      india: pool.filter((i) => i.region === 'india').length,
      global: pool.filter((i) => i.region === 'global').length,
    } as Record<Place, number>;
  }, [facet]);

  // Only topics actually present are offered — the config declares eight, and
  // offering one with nothing behind it is a dead end by construction.
  const topics = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const i of items) if (i.category) counts[i.category] = (counts[i.category] ?? 0) + 1;
    return (Object.keys(counts) as ResourceCategory[]).sort((a, b) => counts[b] - counts[a]);
  }, [items]);

  // The stream bar is not counted: it is always visible, so it is not hidden
  // state the reader needs reminding of.
  const refineCount =
    (f.intent !== 'all' ? 1 : 0) + (f.region !== 'all' ? 1 : 0) +
    (f.days !== null ? 1 : 0) + (sort !== 'newest' ? 1 : 0);
  const anyActive = refineCount > 0 || f.stream !== 'all' || !!f.q.trim();

  const featured = useMemo(() => filtered.find((i) => !i.external) ?? filtered[0], [filtered]);
  const rest = useMemo(
    () => filtered.filter((i) => i.id !== featured?.id).slice(0, shown),
    [filtered, featured, shown]
  );

  const clearAll = () => { setF(EMPTY); setSort('newest'); setShown(PAGE_SIZE); setPanelOpen(false); };

  return (
    <div className="v2-container v2-container-wide v2-section">
      <div className="max-w-3xl mx-auto" style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 className="font-display text-4xl md:text-6xl font-bold v2-text-primary mb-4 leading-tight">
          Freak<span className="v2-accent">quency</span>
        </h1>
        <p className="text-base md:text-lg v2-text-secondary leading-relaxed">
          What actually happened in marketing, filtered — updated every two hours.
        </p>
      </div>

      {/* ------------------------------------------------------ stream bar */}
      {/* Sticks below the fixed site header (81px) so the one axis people
          actually browse by stays reachable deep into a long list. */}
      <div className="sticky z-30 -mx-2 px-2 py-2" style={{ top: '84px' }}>
        <div className="v2-paper rounded-2xl px-3 py-2.5 flex items-center gap-3">
          <div
            ref={streamScroller.ref}
            className={`flex gap-2 overflow-x-auto no-scrollbar flex-1 ${streamScroller.fadeClass}`}
          >
            <Pill label="Everything" count={streamCounts.all} active={f.stream === 'all'} onClick={() => set('stream', 'all')} />
            <Pill label="Our guides" count={streamCounts.guides} active={f.stream === 'guides'} onClick={() => set('stream', 'guides')} />
            <span className="w-px bg-fm-neutral-200 shrink-0 my-1" aria-hidden />
            {topics.map((t) => (
              <Pill key={t} label={CATEGORY_LABELS[t] ?? t} count={streamCounts[t] ?? 0}
                active={f.stream === t} onClick={() => set('stream', t)} />
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {searchOpen || f.q ? (
              <div className="relative">
                <input
                  ref={searchRef}
                  type="search"
                  value={f.q}
                  onChange={(e) => set('q', e.target.value)}
                  onBlur={() => { if (!f.q) setSearchOpen(false); }}
                  placeholder="Search…"
                  className="w-40 md:w-56 pl-8 pr-2 py-2 rounded-full border border-fm-neutral-200 bg-white text-fm-neutral-900 text-sm focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent"
                />
                <Search className="w-4 h-4 text-fm-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            ) : (
              <button onClick={() => setSearchOpen(true)} aria-label="Search the feed"
                className="p-2 rounded-full border border-fm-neutral-200 bg-white text-fm-neutral-600 hover:border-fm-magenta-300">
                <Search className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setPanelOpen((o) => !o)}
              aria-expanded={panelOpen}
              className={[
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border transition-colors',
                refineCount > 0
                  ? 'bg-fm-magenta-600 text-white border-fm-magenta-600'
                  : 'bg-white text-fm-neutral-700 border-fm-neutral-200 hover:border-fm-magenta-300',
              ].join(' ')}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {refineCount > 0 && <span className="text-white/80">{refineCount}</span>}
            </button>
          </div>
        </div>

        {/* Opt-in panel. Everything here is a refinement, not a browse axis. */}
        {panelOpen && (
          <div className="v2-paper rounded-2xl mt-2 p-4 md:p-5 space-y-4">
            <PanelRow label="Written for">
              {INTENTS.map((i) => (
                <Pill key={i.key} subtle label={i.label} count={intentCounts[i.key]}
                  active={f.intent === i.key} onClick={() => set('intent', i.key)} />
              ))}
            </PanelRow>
            <PanelRow label="Region">
              {PLACES.map((p) => (
                <Pill key={String(p.key)} subtle label={p.label} count={regionCounts[p.key]}
                  active={f.region === p.key} onClick={() => set('region', p.key)} />
              ))}
            </PanelRow>
            <PanelRow label="Published">
              {WINDOWS.map((w) => (
                <Pill key={String(w.key)} subtle label={w.label}
                  active={f.days === w.key} onClick={() => set('days', w.key)} />
              ))}
            </PanelRow>
            <PanelRow label="Order">
              <Pill subtle label="Newest first" active={sort === 'newest'} onClick={() => setSort('newest')} />
              <Pill subtle label="Most relevant" active={sort === 'relevant'} onClick={() => setSort('relevant')} />
            </PanelRow>
            {anyActive && (
              <button onClick={clearAll}
                className="inline-flex items-center gap-1.5 text-sm text-fm-magenta-600 hover:text-fm-magenta-700 font-medium">
                <X className="w-4 h-4" /> Clear everything
              </button>
            )}
          </div>
        )}
      </div>

      <p className="text-sm v2-text-tertiary mt-4 mb-4" style={{ textAlign: 'center' }}>
        {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
      </p>

      {filtered.length === 0 ? (
        <div className="v2-paper rounded-3xl p-12" style={{ textAlign: 'center' }}>
          <p className="text-fm-neutral-700 font-medium mb-1">Nothing matches all of that.</p>
          <p className="text-sm text-fm-neutral-500 mb-5">
            Every count is measured against your other choices, so widening any one of them
            brings results back.
          </p>
          <button onClick={clearAll} className="v2-btn v2-btn-magenta">Clear everything</button>
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

function PanelRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <span className="text-xs uppercase tracking-wide text-fm-neutral-400 sm:w-24 shrink-0">{label}</span>
      <div className="flex gap-2 flex-wrap">{children}</div>
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
