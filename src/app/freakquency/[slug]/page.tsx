/**
 * Freakquency article detail — original long-form.
 *
 * Reads the same `blog_posts_public` view the old /blog route did; the posts
 * were not copied into `resources`, because the admin editor still writes to
 * `blog_posts` and duplicating rows would create two sources of truth. See
 * src/lib/resources/public-data.ts.
 *
 * /blog and /blog/[slug] permanently redirect here, so the six indexed URLs
 * keep their equity.
 *
 * DO NOT add a `loading.tsx` to this segment or any ancestor of it. A
 * loading.tsx wraps the segment in a Suspense boundary that flushes a 200
 * shell before `notFound()` is reached, so unknown slugs return HTTP 200 with
 * the not-found UI instead of a real 404 — measured on the old /blog route,
 * where it let Google index unlimited soft-404s.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicPostBySlug, getAllPublishedPosts } from '@/lib/blog-data-public';
import ArticleClient from './ArticleClient';
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

  if (!post) return { title: 'Article Not Found' };

  return {
    title: post.seoTitle || `${post.title} — Freakquency`,
    description: post.seoDescription || post.excerpt,
    keywords: post.tags,
    authors: [{ name: post.author }],
    // `blog/layout.tsx` declares canonical '/blog'. Without this override every
    // post inherits it and tells Google the articles are duplicates of the
    // listing page, which suppresses them from the index entirely.
    alternates: {
      canonical: `/freakquency/${slug}`,
      types: { 'application/rss+xml': '/freakquency/feed.xml' },
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
    '@id': `${SITE_URL}/freakquency/${post.slug}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/freakquency/${post.slug}` },
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
      <ArticleClient post={post} related={related} />
    </>
  );
}
