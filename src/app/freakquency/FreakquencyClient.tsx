'use client';

/**
 * Freakquency — interaction layer.
 *
 * Filters by INTENT rather than content type. Someone arrives knowing why
 * they came ("what's new", "teach me", "help my business"), not which format
 * they want, so type is a badge on the card rather than the navigation.
 *
 * One interleaved feed, newest first. Sectioning by type would fragment a hub
 * that is still mostly one type.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Clock, Search } from 'lucide-react';
import type { FeedItem } from '@/lib/resources/public-data';
import type { Audience } from '@/lib/resources/types';
import { CATEGORY_LABELS, RESOURCE_TYPE_LABELS } from '@/lib/resources/types';

type Filter = Audience | 'all';

const FILTERS: { key: Filter; label: string; blurb: string }[] = [
  { key: 'all', label: 'Everything', blurb: 'The whole feed, newest first' },
  { key: 'professionals', label: 'Latest', blurb: 'What moved this week' },
  { key: 'aspiring', label: 'Learn', blurb: 'Understand the craft' },
  { key: 'owners', label: 'For your business', blurb: 'Act on it' },
];

/** Relative age. Absolute dates make a feed look stale even when it isn't. */
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

export default function FreakquencyClient({
  items,
  counts,
}: {
  items: FeedItem[];
  counts: Record<Filter, number>;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (filter !== 'all' && !i.audience.includes(filter)) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        i.excerpt.toLowerCase().includes(q) ||
        (i.sourceName || '').toLowerCase().includes(q)
      );
    });
  }, [items, filter, query]);

  // The newest original piece leads when there is one — ours should open the
  // page, not whichever wire story happens to be most recent.
  const featured = useMemo(
    () => filtered.find((i) => !i.external) ?? filtered[0],
    [filtered]
  );
  const rest = useMemo(
    () => filtered.filter((i) => i.id !== featured?.id).slice(0, shown),
    [filtered, featured, shown]
  );

  return (
    <div className="v2-container v2-container-wide v2-section">
      {/* ---------------------------------------------------------- header */}
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

      {/* ---------------------------------------------------------- controls */}
      <div className="v2-paper rounded-3xl p-4 md:p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => {
                    setFilter(f.key);
                    setShown(PAGE_SIZE);
                  }}
                  title={f.blurb}
                  className={[
                    'px-4 py-2 rounded-full text-sm font-medium transition-colors border',
                    active
                      ? 'bg-fm-magenta-600 text-white border-fm-magenta-600'
                      : 'bg-white text-fm-neutral-700 border-fm-neutral-200 hover:border-fm-magenta-300',
                  ].join(' ')}
                >
                  {f.label}
                  <span className={active ? 'text-white/70 ml-1.5' : 'text-fm-neutral-400 ml-1.5'}>
                    {counts[f.key] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative lg:w-72">
            <Search className="w-4 h-4 text-fm-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShown(PAGE_SIZE);
              }}
              placeholder="Search the feed…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-fm-neutral-200 bg-white text-fm-neutral-900 text-sm focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="v2-paper rounded-3xl p-12" style={{ textAlign: 'center' }}>
          <p className="text-fm-neutral-700 font-medium mb-1">Nothing matches that.</p>
          <p className="text-sm text-fm-neutral-500">Try a different filter or clear the search.</p>
        </div>
      ) : (
        <>
          {featured && <FeaturedCard item={featured} />}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
            {rest.map((item) => (
              <Card key={item.id} item={item} />
            ))}
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
