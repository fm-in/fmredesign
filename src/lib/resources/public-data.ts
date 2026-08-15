/**
 * Public data layer for Freakquency — the merged content hub.
 *
 * Reads from TWO sources and presents one shape:
 *   - `resources`         aggregated news, and future native guides/tools
 *   - `blog_posts_public` the six original posts, surfaced as guides
 *
 * The posts are NOT copied into `resources`. The admin editor at /admin/blog
 * writes to `blog_posts`, so duplicating rows would create two sources of
 * truth that drift the first time someone edits a post. Merging on read costs
 * one extra query and keeps the editor untouched. If original content ever
 * moves natively into `resources`, this adapter is the only thing to change.
 */

import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAllPublishedPosts } from '@/lib/blog-data-public';
import type { Audience, ResourceCategory, ResourceType } from './types';

export interface FeedItem {
  id: string;
  type: ResourceType;
  title: string;
  excerpt: string;
  /** Where the card goes. Internal path for ours, absolute URL for news. */
  href: string;
  /** True when the link leaves the site — drives the external-link icon. */
  external: boolean;
  sourceName: string | null;
  category: ResourceCategory | null;
  audience: Audience[];
  publishedAt: string;
  imageUrl: string | null;
  readMinutes: number | null;
}

/** Newest first, with a stable tiebreak so pagination cannot repeat an item. */
function byNewest(a: FeedItem, b: FeedItem): number {
  const d = Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  return d !== 0 ? d : a.id.localeCompare(b.id);
}

interface ResourceRow {
  id: string; type: string; slug: string | null; title: string;
  excerpt: string | null; source_url: string | null; source_name: string | null;
  category: string | null; audience: unknown; published_at: string | null;
  cover_image_url: string | null; read_minutes: number | null;
}

function fromResource(r: ResourceRow): FeedItem | null {
  // Aggregated items are useless without somewhere to send the reader.
  const href = r.slug ? `/freakquency/${r.slug}` : r.source_url;
  if (!href) return null;
  return {
    id: r.id,
    type: (r.type as ResourceType) || 'news',
    title: r.title,
    excerpt: r.excerpt || '',
    href,
    // Derived from the href, not from "has no slug". Tools are ours but live
    // at their own route (/scorecard) and are stored with a relative
    // source_url — treating them as external would open our own page in a new
    // tab with an outbound arrow on it.
    external: /^https?:\/\//i.test(href),
    sourceName: r.source_name,
    category: (r.category as ResourceCategory) || null,
    audience: Array.isArray(r.audience) ? (r.audience as Audience[]) : [],
    publishedAt: r.published_at || new Date().toISOString(),
    imageUrl: r.cover_image_url,
    readMinutes: r.read_minutes,
  };
}

/**
 * Everything publishable, newest first.
 *
 * Never throws: the hub must render even if one source is unavailable. A
 * partial feed is a far better failure than a 500 on the page the whole
 * content strategy points at.
 */
export async function getFeedItems(): Promise<FeedItem[]> {
  const [news, posts] = await Promise.all([
    (async (): Promise<FeedItem[]> => {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('resources')
          .select(
            'id,type,slug,title,excerpt,source_url,source_name,category,audience,published_at,cover_image_url,read_minutes'
          )
          .eq('status', 'published')
          .is('duplicate_of', null)
          .order('published_at', { ascending: false })
          .limit(400);
        if (error) throw error;
        return ((data || []) as ResourceRow[]).map(fromResource).filter((x): x is FeedItem => !!x);
      } catch (err) {
        console.error('[freakquency] resources unavailable:', err);
        return [];
      }
    })(),
    (async (): Promise<FeedItem[]> => {
      try {
        const posts = await getAllPublishedPosts();
        return posts.map((p) => ({
          id: `post_${p.slug}`,
          type: 'guide' as ResourceType,
          title: p.title,
          excerpt: p.excerpt,
          href: `/freakquency/${p.slug}`,
          external: false,
          sourceName: null,
          category: null,
          // Original long-form serves the people learning the craft and the
          // owners trying to understand it; professionals come for the news.
          audience: ['aspiring', 'owners'] as Audience[],
          publishedAt: p.date,
          imageUrl: p.coverImage || null,
          readMinutes: parseInt(p.readTime, 10) || null,
        }));
      } catch (err) {
        console.error('[freakquency] blog posts unavailable:', err);
        return [];
      }
    })(),
  ]);

  return [...news, ...posts].sort(byNewest);
}

/** Counts per audience, for the filter chips. Computed once, server-side. */
export function audienceCounts(items: FeedItem[]): Record<Audience | 'all', number> {
  return {
    all: items.length,
    professionals: items.filter((i) => i.audience.includes('professionals')).length,
    aspiring: items.filter((i) => i.audience.includes('aspiring')).length,
    owners: items.filter((i) => i.audience.includes('owners')).length,
  };
}
