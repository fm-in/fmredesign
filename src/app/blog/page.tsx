/**
 * Blog listing — server shell.
 *
 * Fetches the published posts (and derived category/tag lists) at request
 * time with 60s revalidation, then hands them to BlogListingClient for
 * the search/filter interaction layer.
 */

import { Metadata } from 'next';
import {
  getAllPublishedPosts,
  getAllPublicCategories,
  getAllPublicTags,
} from '@/lib/blog-data-public';
import BlogListingClient from './BlogListingClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Blog | Freaking Minds — Marketing Insights & Strategies',
  description:
    'Expert insights on digital marketing, SEO, content strategy, and growth — from the Freaking Minds agency floor in Bhopal.',
};

export default async function BlogPage() {
  const [posts, categories, tags] = await Promise.all([
    getAllPublishedPosts(),
    getAllPublicCategories(),
    getAllPublicTags(),
  ]);
  return <BlogListingClient posts={posts} categories={categories} tags={tags} />;
}
