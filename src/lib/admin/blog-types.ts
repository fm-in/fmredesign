/**
 * Blog CMS — shared types for the blog_posts domain.
 *
 * Mirrors the academy-types pattern: one unified Post shape across draft,
 * published and archived. Row→camelCase transform here is the boundary
 * between Supabase (snake_case) and the API/UI.
 */

export type PostStatus = 'draft' | 'published' | 'archived';
export type PostSource = 'manual' | 'upload-docx' | 'upload-md' | 'seeded';

export interface PostTag {
  name: string;
  slug: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  coverImageUrl?: string;
  coverImageAlt?: string;

  bodyHtml?: string;
  bodyTiptap?: Record<string, unknown>;   // TipTap JSONContent shape — keep loose
  wordCount: number;
  readMinutes: number;

  tags?: PostTag[];
  category?: string;
  authorName?: string;
  authorId?: string;
  authorAvatarUrl?: string;

  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  ogImageUrl?: string;

  status: PostStatus;
  featured: boolean;
  publishedAt?: string;
  scheduledFor?: string;

  source: PostSource;
  aiAssisted: boolean;
  sourceFilename?: string;

  createdAt: string;
  updatedAt: string;
}

/** Public-facing post shape (mirrors the blog_posts_public view). */
export type PublicBlogPost = Omit<
  BlogPost,
  'bodyTiptap' | 'status' | 'scheduledFor' | 'source' | 'aiAssisted' | 'sourceFilename' | 'authorId'
>;

// ─────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

export const SOURCE_LABELS: Record<PostSource, string> = {
  manual: 'Manual',
  'upload-docx': 'Word upload',
  'upload-md': 'Markdown upload',
  seeded: 'Seeded',
};

export function generatePostId(): string {
  return `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Generate a URL-safe slug from a title. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')      // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')          // strip punctuation
    .trim()
    .replace(/\s+/g, '-')                  // spaces → hyphens
    .replace(/-+/g, '-')                   // collapse runs of hyphens
    .slice(0, 80);                         // hard cap
}

/** ~200 words/min average reading speed. Minimum 1 minute. */
export function estimateReadMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 200));
}

/** Strip HTML to count words. Fast enough for typical post sizes. */
export function countWordsInHtml(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

/** snake_case row → camelCase API shape. */
export function transformPostRow(row: Record<string, unknown>): BlogPost {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    excerpt: (row.excerpt as string) || undefined,
    coverImageUrl: (row.cover_image_url as string) || undefined,
    coverImageAlt: (row.cover_image_alt as string) || undefined,
    bodyHtml: (row.body_html as string) || undefined,
    bodyTiptap: (row.body_tiptap as Record<string, unknown>) || undefined,
    wordCount: Number(row.word_count) || 0,
    readMinutes: Number(row.read_minutes) || 1,
    tags: (row.tags as PostTag[]) || undefined,
    category: (row.category as string) || undefined,
    authorName: (row.author_name as string) || undefined,
    authorId: (row.author_id as string) || undefined,
    authorAvatarUrl: (row.author_avatar_url as string) || undefined,
    seoTitle: (row.seo_title as string) || undefined,
    seoDescription: (row.seo_description as string) || undefined,
    canonicalUrl: (row.canonical_url as string) || undefined,
    ogImageUrl: (row.og_image_url as string) || undefined,
    status: row.status as PostStatus,
    featured: !!row.featured,
    publishedAt: (row.published_at as string) || undefined,
    scheduledFor: (row.scheduled_for as string) || undefined,
    source: (row.source as PostSource) || 'manual',
    aiAssisted: !!row.ai_assisted,
    sourceFilename: (row.source_filename as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
