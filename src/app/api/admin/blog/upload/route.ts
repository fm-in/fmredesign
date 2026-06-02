/**
 * Admin Blog CMS — File upload + parse + AI assist
 *
 *   POST /api/admin/blog/upload   (multipart/form-data)
 *     file: <File>           — .docx or .md (required)
 *     aiAssist: 'true'|'false'  — optional, default 'true'
 *
 * Flow:
 *   1. Authn + RBAC (content.write)
 *   2. Validate file (extension + size)
 *   3. Parse → { html, json, plainText, meta, images }
 *   4. Upload inline images to Supabase Storage; rewrite placeholders
 *   5. Run AI assist on the plain text (Groq) if enabled + key present
 *   6. Insert a `draft` post with everything pre-filled
 *   7. Return the created post id + the AI suggestion object so the UI can
 *      surface "AI filled X / you might want to tweak Y" hints
 */

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { logAuditEvent, getClientIP } from '@/lib/admin/audit-log';
import { ApiResponse } from '@/lib/api-response';
import {
  parseDocx,
  parseMarkdown,
  replaceImagePlaceholders,
  type ParsedDoc,
} from '@/lib/admin/blog-parsers';
import { suggestPostMetadata } from '@/lib/admin/blog-ai-assist';
import {
  generatePostId,
  slugify,
  transformPostRow,
  type PostSource,
  type PostTag,
} from '@/lib/admin/blog-types';
import {
  ensureBlogBucket,
  uploadInlineImage,
  BLOG_BUCKET,
} from '@/lib/admin/blog-storage';

const MAX_FILE_BYTES = 15 * 1024 * 1024;   // 15 MB — generous for image-heavy docx

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'content.write');
  if ('error' in auth) return auth.error;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return ApiResponse.validationError('Expected multipart/form-data');
  }

  const file = form.get('file');
  if (!file || !(file instanceof File)) {
    return ApiResponse.validationError('No file uploaded (field name "file")');
  }
  if (file.size > MAX_FILE_BYTES) {
    return ApiResponse.error(`File too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB)`, 413);
  }

  const filename = file.name || 'upload';
  const ext = filename.toLowerCase().split('.').pop();
  let source: PostSource;
  let parsed: ParsedDoc;

  try {
    if (ext === 'docx') {
      source = 'upload-docx';
      const buf = Buffer.from(await file.arrayBuffer());
      parsed = await parseDocx(buf);
    } else if (ext === 'md' || ext === 'markdown') {
      source = 'upload-md';
      const text = await file.text();
      parsed = await parseMarkdown(text);
    } else {
      return ApiResponse.validationError(
        `Unsupported file type ".${ext}" — upload a .docx or .md file`
      );
    }
  } catch (err) {
    console.error('Blog parse error:', err);
    return ApiResponse.error(`Could not parse the file: ${(err as Error).message}`);
  }

  if (!parsed.html || parsed.html.length < 20) {
    return ApiResponse.error('The uploaded file appears empty or unreadable');
  }

  const supabase = getSupabaseAdmin();
  const postId = generatePostId();

  // ── Inline images → Supabase Storage ──────────────────────────────────
  if (parsed.images.length > 0) {
    try {
      await ensureBlogBucket(supabase);
      const urlMap: Record<string, string> = {};
      for (const img of parsed.images) {
        const url = await uploadInlineImage(supabase, {
          postId,
          filename: img.filename,
          contentType: img.contentType,
          buffer: img.buffer,
        });
        urlMap[img.placeholder] = url;
      }
      parsed = replaceImagePlaceholders(parsed, urlMap);
    } catch (err) {
      console.error('Inline image upload failed:', err);
      // Continue — post will still be created but inline images will be
      // broken placeholders. Surface a warning to the editor.
      parsed.warnings.push('Some inline images could not be uploaded — please re-add them in the editor.');
    }
  }

  // ── AI assist ─────────────────────────────────────────────────────────
  const aiOn = (form.get('aiAssist') as string) !== 'false';
  const aiSuggestion = aiOn
    ? await suggestPostMetadata({
        text: parsed.plainText,
        hintedTitle: parsed.meta.title,
      })
    : {};

  // ── Resolve final fields (uploaded meta wins over AI suggestion) ──────
  const title = parsed.meta.title || aiSuggestion.title || filename.replace(/\.[^.]+$/, '');
  const slugCandidate = aiSuggestion.slug || slugify(title);
  const finalSlug = await resolveUniqueSlug(supabase, slugCandidate);

  const tags: PostTag[] | undefined =
    parsed.meta.tags && parsed.meta.tags.length > 0
      ? parsed.meta.tags
      : aiSuggestion.tags;

  // ── Insert draft ──────────────────────────────────────────────────────
  const record = {
    id: postId,
    slug: finalSlug,
    title,
    excerpt: parsed.meta.excerpt || aiSuggestion.excerpt || null,
    cover_image_url: parsed.meta.coverImageUrl || null,
    body_html: parsed.html,
    body_tiptap: parsed.json,
    word_count: parsed.wordCount,
    read_minutes: parsed.readMinutes,
    tags: tags || null,
    category: parsed.meta.category || aiSuggestion.category || null,
    author_name: parsed.meta.authorName || auth.user.name || null,
    author_id: auth.user.id || null,
    seo_title: aiSuggestion.seoTitle || null,
    seo_description: aiSuggestion.seoDescription || null,
    status: 'draft' as const,
    source,
    ai_assisted: aiOn,
    source_filename: filename,
  };

  const { data, error } = await supabase
    .from('blog_posts')
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error('Blog post insert (from upload) failed:', error);
    return ApiResponse.error('Could not save the parsed post');
  }

  await logAuditEvent({
    user_id: auth.user.id,
    user_name: auth.user.name,
    action: 'create',
    resource_type: 'blog_post',
    resource_id: postId,
    details: {
      source,
      filename,
      wordCount: parsed.wordCount,
      images: parsed.images.length,
      ai_assisted: aiOn,
    },
    ip_address: getClientIP(request),
  }).catch((err) => console.error('Audit log failed:', err));

  return ApiResponse.success(transformPostRow(data), {
    aiSuggestion,
    warnings: parsed.warnings,
    storageBucket: BLOG_BUCKET,
  });
}

async function resolveUniqueSlug(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  base: string
): Promise<string> {
  const cleanBase = slugify(base) || `post-${Date.now()}`;
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
