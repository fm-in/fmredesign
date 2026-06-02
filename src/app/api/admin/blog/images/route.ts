/**
 * Admin Blog CMS — Cover / inline image upload
 *
 *   POST /api/admin/blog/images   (multipart/form-data)
 *     file:    <File>             — image (required)
 *     postId:  string             — owning post id (required)
 *     kind:    'covers' | 'inline'  default 'covers'
 *
 * Returns { url, path } so the editor can immediately put the image into
 * the TipTap document or set it as the post's cover.
 */

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { ApiResponse } from '@/lib/api-response';
import { ensureBlogBucket, uploadInlineImage, BLOG_BUCKET } from '@/lib/admin/blog-storage';

const MAX_BYTES = 8 * 1024 * 1024;   // 8 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

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
  const postId = (form.get('postId') as string) || '';
  const kind = ((form.get('kind') as string) || 'covers') as 'covers' | 'inline';

  if (!file || !(file instanceof File)) {
    return ApiResponse.validationError('No file uploaded');
  }
  if (!postId) return ApiResponse.validationError('postId is required');
  if (file.size > MAX_BYTES) {
    return ApiResponse.error(`Image too large (max ${MAX_BYTES / 1024 / 1024} MB)`, 413);
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return ApiResponse.validationError(`Unsupported image type: ${file.type}`);
  }

  const supabase = getSupabaseAdmin();

  try {
    await ensureBlogBucket(supabase);
    const url = await uploadInlineImage(supabase, {
      postId,
      filename: file.name || 'cover',
      contentType: file.type,
      buffer: Buffer.from(await file.arrayBuffer()),
      kind,
    });
    return ApiResponse.success({ url, bucket: BLOG_BUCKET, kind });
  } catch (err) {
    console.error('Image upload failed:', err);
    return ApiResponse.error('Failed to upload image');
  }
}
