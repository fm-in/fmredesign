/**
 * Public blog data adapter — bridges the new Supabase-backed
 * `blog_posts_public` view to the legacy shape the public /blog pages
 * were written against. Keeps the existing JSX untouched while swapping
 * the data source.
 *
 * Once `src/lib/blog-data.ts` is fully retired, public pages can import
 * BlogPost shapes from `@/lib/admin/blog-types` directly.
 */

import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase';
import { transformPostRow, type BlogPost } from '@/lib/admin/blog-types';

/** Public-facing post shape — mirrors the legacy blog-data.ts contract. */
export interface PublicPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;            // HTML — render with dangerouslySetInnerHTML
  category: string;
  author: string;
  date: string;               // ISO string
  readTime: string;           // "5 min read"
  tags: string[];
  featured: boolean;
  coverImage?: string;
  authorAvatar?: string;
  seoTitle?: string;
  seoDescription?: string;
}

function toPublic(p: BlogPost): PublicPost {
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt || '',
    content: p.bodyHtml || '',
    category: p.category || 'General',
    author: p.authorName || 'Freaking Minds',
    date: p.publishedAt || p.createdAt,
    readTime: `${p.readMinutes} min read`,
    tags: (p.tags || []).map((t) => t.name),
    featured: p.featured,
    coverImage: p.coverImageUrl,
    authorAvatar: p.authorAvatarUrl,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
  };
}

export async function getAllPublishedPosts(): Promise<PublicPost[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('blog_posts_public')
      .select('*')
      .order('published_at', { ascending: false, nullsFirst: false });
    if (error) {
      console.error('Public blog list fetch error:', error);
      return [];
    }
    return (data || []).map((row) => toPublic(transformPostRow(row)));
  } catch (e) {
    console.error('Public blog list threw:', e);
    return [];
  }
}

export async function getPublicPostBySlug(slug: string): Promise<PublicPost | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('blog_posts_public')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error || !data) return null;
    return toPublic(transformPostRow(data));
  } catch (e) {
    console.error('Public blog detail fetch threw:', e);
    return null;
  }
}

export async function getRelatedPublicPosts(slug: string, limit = 3): Promise<PublicPost[]> {
  const all = await getAllPublishedPosts();
  const current = all.find((p) => p.slug === slug);
  if (!current) return all.slice(0, limit);
  // Same category first, then any.
  const sameCat = all.filter((p) => p.slug !== slug && p.category === current.category);
  const others = all.filter((p) => p.slug !== slug && p.category !== current.category);
  return [...sameCat, ...others].slice(0, limit);
}

export async function getAllPublicCategories(): Promise<string[]> {
  const posts = await getAllPublishedPosts();
  const set = new Set<string>();
  for (const p of posts) if (p.category) set.add(p.category);
  return Array.from(set).sort();
}

export async function getAllPublicTags(): Promise<string[]> {
  const posts = await getAllPublishedPosts();
  const set = new Set<string>();
  for (const p of posts) for (const t of p.tags) set.add(t);
  return Array.from(set).sort();
}
