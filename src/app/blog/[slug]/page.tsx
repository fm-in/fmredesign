/**
 * Blog detail — server-rendered, pre-generated at build time for every
 * currently-published slug. Renders the post's `body_html` directly
 * (already sanitised at upload time by mammoth / marked).
 *
 * DO NOT add a `loading.tsx` to this segment or any ancestor of it.
 * A loading.tsx wraps the segment in a Suspense boundary, which flushes a
 * 200 shell before `notFound()` below is reached — so unknown slugs return
 * HTTP 200 with the not-found UI instead of a real 404, and Google indexes
 * unlimited soft-404s. This was measured: with either
 * `blog/loading.tsx` or `blog/[slug]/loading.tsx` present, a bad slug
 * returned 200; with both absent it returns 404. The listing keeps its
 * skeleton by living in the `(index)` route group, which `[slug]` does not
 * inherit from.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicPostBySlug, getAllPublishedPosts } from '@/lib/blog-data-public';
import BlogPostClient from './BlogPostClient';
import { OG_IMAGE } from '@/lib/seo';
import { SITE_URL } from '@/lib/site-url';

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const posts = await getAllPublishedPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicPostBySlug(slug);

  if (!post) return { title: 'Article Not Found | FreakingMinds Blog' };

  return {
    title: post.seoTitle || `${post.title} | FreakingMinds Blog`,
    description: post.seoDescription || post.excerpt,
    keywords: post.tags,
    authors: [{ name: post.author }],
    // `blog/layout.tsx` declares canonical '/blog'. Without this override every
    // post inherits it and tells Google the articles are duplicates of the
    // listing page, which suppresses them from the index entirely.
    alternates: {
      canonical: `/blog/${slug}`,
      types: { 'application/rss+xml': '/blog/feed.xml' },
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
      // Fall back to the site image rather than undefined — a post without a
      // cover was sharing to WhatsApp and LinkedIn with a blank card.
      images: post.coverImage ? [{ url: post.coverImage }] : [OG_IMAGE],
      siteName: 'Freaking Minds',
      locale: 'en_IN',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: post.coverImage ? [post.coverImage] : [OG_IMAGE.url],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublicPostBySlug(slug);
  if (!post) notFound();

  // Surface 3 related posts so the client can render the "Read next" rail
  // without a second round-trip.
  const all = await getAllPublishedPosts();
  const related = (() => {
    const sameCat = all.filter((p) => p.slug !== slug && p.category === post.category);
    const others = all.filter((p) => p.slug !== slug && p.category !== post.category);
    return [...sameCat, ...others].slice(0, 3);
  })();

  /**
   * Article structured data.
   *
   * The root layout supplies Organization / LocalBusiness / WebSite /
   * BreadcrumbList, but nothing described the article itself, so posts were
   * not eligible for article rich results at all. `publisher` points at the
   * Organization node the root layout already declares rather than repeating
   * it, so there is one organisation entity across the site.
   */
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${SITE_URL}/blog/${post.slug}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${post.slug}` },
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: post.coverImage ? [post.coverImage] : [`${SITE_URL}${OG_IMAGE.url}`],
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Person', name: post.author },
    publisher: { '@id': `${SITE_URL}/#organization` },
    keywords: post.tags?.join(', ') || undefined,
    articleSection: post.category,
    inLanguage: 'en-IN',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <BlogPostClient post={post} related={related} />
    </>
  );
}
