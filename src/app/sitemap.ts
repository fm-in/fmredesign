import type { MetadataRoute } from 'next';
import { getAllPublishedPosts } from '@/lib/blog-data-public';
import { getSupabaseAdmin } from '@/lib/supabase';
import { SITE_URL } from '@/lib/site-url';

/**
 * Sitemap.
 *
 * Blog URLs come from the CMS (`blog_posts_public`), not the retired
 * `blog-data.ts` array — publishing or archiving a post now updates the
 * sitemap on the next revalidation instead of silently drifting.
 *
 * Academy programs are included because they are the site's only
 * transactional pages; they were previously absent entirely.
 */

const baseUrl = SITE_URL;

/** Revalidate hourly so newly published posts and programs appear promptly. */
export const revalidate = 3600;

/** Program slugs open to the public. Never throws — a sitemap must always render. */
async function getProgramEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('programs_public')
      .select('slug, updated_at, status')
      // `programs_public` does not filter by status, so exclude the states
      // that should never be indexed. `closed` stays — the page still exists
      // and carries SEO value once enrolment reopens.
      .not('status', 'in', '(draft,archived)');
    if (error) throw error;

    return (data || []).map((p: { slug: string; updated_at?: string; status?: string }) => ({
      url: `${baseUrl}/academy/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch (err) {
    console.error('[sitemap] could not load academy programs:', err);
    return [];
  }
}

/** Published blog posts. Never throws — a sitemap must always render. */
async function getBlogEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const posts = await getAllPublishedPosts();
    return posts.map((post) => ({
      url: `${baseUrl}/freakquency/${post.slug}`,
      lastModified: post.date ? new Date(post.date) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));
  } catch (err) {
    console.error('[sitemap] could not load blog posts:', err);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/work`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    // Academy listing — a primary conversion path, so it ranks with /services.
    { url: `${baseUrl}/academy`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/freakquency`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/get-started`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/scorecard`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/creativeminds`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Fetched concurrently — one slow query should not double sitemap latency.
  const [blogPages, programPages] = await Promise.all([
    getBlogEntries(),
    getProgramEntries(),
  ]);

  return [...staticPages, ...programPages, ...blogPages];
}
