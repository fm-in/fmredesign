/**
 * Admin Blog CMS — Posts CRUD
 *
 *   GET    /api/admin/blog/posts              — list (filter ?status)
 *   GET    /api/admin/blog/posts?id=X         — fetch one (admin view)
 *   POST   /api/admin/blog/posts              — create
 *   PUT    /api/admin/blog/posts              — update (body.id required)
 *   DELETE /api/admin/blog/posts?id=X         — delete
 *
 * RBAC mirrors academy: content.read for GET, content.write for write,
 * content.delete for DELETE. Slug is required and unique.
 */

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { logAuditEvent, getClientIP } from '@/lib/admin/audit-log';
import { ApiResponse } from '@/lib/api-response';
import {
  generatePostId,
  slugify,
  transformPostRow,
  countWordsInHtml,
  estimateReadMinutes,
  type PostStatus,
  type PostSource,
  type PostTag,
} from '@/lib/admin/blog-types';

const ALLOWED_STATUSES: PostStatus[] = ['draft', 'published', 'archived'];
const ALLOWED_SOURCES: PostSource[] = ['manual', 'upload-docx', 'upload-md', 'seeded'];

// ─────────────────────────────────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'content.read');
  if ('error' in auth) return auth.error;

  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');
  const statusFilter = searchParams.get('status') as PostStatus | null;

  const supabase = getSupabaseAdmin();

  if (id) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return ApiResponse.error('Failed to fetch post');
    if (!data) return ApiResponse.notFound('Post not found');
    return ApiResponse.success(transformPostRow(data));
  }

  let query = supabase
    .from('blog_posts')
    .select('*')
    .order('updated_at', { ascending: false });
  if (statusFilter) query = query.eq('status', statusFilter);

  const { data, error } = await query;
  if (error) {
    console.error('Blog posts list error:', error);
    return ApiResponse.error('Failed to fetch posts');
  }
  return ApiResponse.success((data || []).map(transformPostRow));
}

// ─────────────────────────────────────────────────────────────────────────
// POST — create
// ─────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'content.write');
  if ('error' in auth) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return ApiResponse.validationError('Invalid JSON body');
  }

  const title = (body.title as string)?.trim();
  if (!title) return ApiResponse.validationError('Title is required');

  // Slug: explicit or derived from title. If derived, ensure unique by
  // appending a short suffix on collision.
  const requestedSlug = ((body.slug as string) || slugify(title)).trim();
  if (!requestedSlug) return ApiResponse.validationError('Slug could not be generated from title');

  const supabase = getSupabaseAdmin();
  const slug = await uniqueSlug(supabase, requestedSlug);

  const bodyHtml = (body.bodyHtml as string) || '';
  const wordCount = bodyHtml ? countWordsInHtml(bodyHtml) : 0;

  const id = (body.id as string) || generatePostId();
  const source = ALLOWED_SOURCES.includes(body.source as PostSource)
    ? (body.source as PostSource)
    : 'manual';

  const record: Record<string, unknown> = {
    id,
    slug,
    title,
    excerpt: (body.excerpt as string) || null,
    cover_image_url: (body.coverImageUrl as string) || null,
    cover_image_alt: (body.coverImageAlt as string) || null,
    body_html: bodyHtml || null,
    body_tiptap: (body.bodyTiptap as Record<string, unknown>) || null,
    word_count: wordCount,
    read_minutes: estimateReadMinutes(wordCount),
    tags: (body.tags as PostTag[]) || null,
    category: (body.category as string) || null,
    author_name: (body.authorName as string) || auth.user.name || null,
    author_id: (body.authorId as string) || auth.user.id || null,
    author_avatar_url: (body.authorAvatarUrl as string) || null,
    seo_title: (body.seoTitle as string) || null,
    seo_description: (body.seoDescription as string) || null,
    canonical_url: (body.canonicalUrl as string) || null,
    og_image_url: (body.ogImageUrl as string) || null,
    status: ALLOWED_STATUSES.includes(body.status as PostStatus)
      ? (body.status as PostStatus)
      : 'draft',
    featured: !!body.featured,
    scheduled_for: (body.scheduledFor as string) || null,
    source,
    ai_assisted: !!body.aiAssisted,
    source_filename: (body.sourceFilename as string) || null,
  };

  const { data, error } = await supabase
    .from('blog_posts')
    .insert(record)
    .select()
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return ApiResponse.error('A post with this slug already exists', 409);
    }
    console.error('Blog post insert error:', error);
    return ApiResponse.error('Failed to create post');
  }

  await logAuditEvent({
    user_id: auth.user.id,
    user_name: auth.user.name,
    action: 'create',
    resource_type: 'blog_post',
    resource_id: id,
    details: { title, slug, source, ai_assisted: !!body.aiAssisted },
    ip_address: getClientIP(request),
  }).catch((err) => console.error('Audit log failed:', err));

  return ApiResponse.success(transformPostRow(data));
}

// ─────────────────────────────────────────────────────────────────────────
// PUT — update
// ─────────────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'content.write');
  if ('error' in auth) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return ApiResponse.validationError('Invalid JSON body');
  }

  const id = body.id as string;
  if (!id) return ApiResponse.validationError('id is required');

  const supabase = getSupabaseAdmin();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  // Whitelist — never let through DB-owned columns.
  const fields: Array<[string, string]> = [
    ['title', 'title'],
    ['excerpt', 'excerpt'],
    ['coverImageUrl', 'cover_image_url'],
    ['coverImageAlt', 'cover_image_alt'],
    ['bodyHtml', 'body_html'],
    ['bodyTiptap', 'body_tiptap'],
    ['tags', 'tags'],
    ['category', 'category'],
    ['authorName', 'author_name'],
    ['authorAvatarUrl', 'author_avatar_url'],
    ['seoTitle', 'seo_title'],
    ['seoDescription', 'seo_description'],
    ['canonicalUrl', 'canonical_url'],
    ['ogImageUrl', 'og_image_url'],
    ['featured', 'featured'],
    ['scheduledFor', 'scheduled_for'],
  ];
  for (const [k, col] of fields) {
    if (body[k] !== undefined) updates[col] = body[k] === '' ? null : body[k];
  }

  if (body.slug !== undefined) {
    const newSlug = slugify((body.slug as string) || '');
    if (!newSlug) return ApiResponse.validationError('Slug cannot be empty');
    updates.slug = newSlug;
  }

  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(body.status as PostStatus)) {
      return ApiResponse.validationError(`Invalid status: ${body.status}`);
    }
    updates.status = body.status;
  }

  // Recompute word/read counts if body changed.
  if (typeof body.bodyHtml === 'string') {
    const wc = countWordsInHtml(body.bodyHtml);
    updates.word_count = wc;
    updates.read_minutes = estimateReadMinutes(wc);
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return ApiResponse.error('A post with this slug already exists', 409);
    }
    console.error('Blog post update error:', error);
    return ApiResponse.error('Failed to update post');
  }
  if (!data) return ApiResponse.notFound('Post not found');

  await logAuditEvent({
    user_id: auth.user.id,
    user_name: auth.user.name,
    action: 'update',
    resource_type: 'blog_post',
    resource_id: id,
    details: { updatedFields: Object.keys(updates).filter((k) => k !== 'updated_at') },
    ip_address: getClientIP(request),
  }).catch((err) => console.error('Audit log failed:', err));

  return ApiResponse.success(transformPostRow(data));
}

// ─────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'content.delete');
  if ('error' in auth) return auth.error;

  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');
  if (!id) return ApiResponse.validationError('id is required');

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('blog_posts').delete().eq('id', id);
  if (error) {
    console.error('Blog post delete error:', error);
    return ApiResponse.error('Failed to delete post');
  }

  await logAuditEvent({
    user_id: auth.user.id,
    user_name: auth.user.name,
    action: 'delete',
    resource_type: 'blog_post',
    resource_id: id,
    details: {},
    ip_address: getClientIP(request),
  }).catch((err) => console.error('Audit log failed:', err));

  return ApiResponse.success({ id, deleted: true });
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/** Resolve a slug to one that isn't taken. Adds `-2`, `-3`, ... on collision. */
async function uniqueSlug(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  base: string
): Promise<string> {
  const cleanBase = slugify(base);
  let candidate = cleanBase;
  let n = 1;
  while (true) {
    const { data } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!data) return candidate;
    n += 1;
    candidate = `${cleanBase}-${n}`;
    if (n > 50) return `${cleanBase}-${Date.now()}`;
  }
}
