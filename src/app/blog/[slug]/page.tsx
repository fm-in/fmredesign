/**
 * Blog detail — server-rendered, pre-generated at build time for every
 * currently-published slug. Renders the post's `body_html` directly
 * (already sanitised at upload time by mammoth / marked).
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicPostBySlug, getAllPublishedPosts } from '@/lib/blog-data-public';
import BlogPostClient from './BlogPostClient';

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
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
      siteName: 'FreakingMinds',
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: post.coverImage ? [post.coverImage] : undefined,
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

  return <BlogPostClient post={post} related={related} />;
}
