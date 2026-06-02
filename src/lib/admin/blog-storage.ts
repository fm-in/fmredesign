/**
 * Blog assets stored in Supabase Storage.
 *
 *   Bucket name : blog-assets (public-read)
 *   Path layout : covers/<post-id>/<filename>
 *                 inline/<post-id>/<filename>
 *
 * The bucket is created on first use rather than requiring a separate
 * Supabase Dashboard step — keeps the install path one command shorter.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export const BLOG_BUCKET = 'blog-assets';

/** Idempotent — creates the bucket if missing, no-op otherwise. */
export async function ensureBlogBucket(supabase: SupabaseClient): Promise<void> {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === BLOG_BUCKET)) return;

  const { error } = await supabase.storage.createBucket(BLOG_BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,    // 10 MB per asset
  });
  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
}

interface UploadOpts {
  postId: string;
  filename: string;
  contentType: string;
  buffer: Buffer;
  /** 'inline' for body images, 'covers' for cover images. */
  kind?: 'inline' | 'covers';
}

/**
 * Upload an inline image and return its public URL. Filenames are
 * sanitised so collisions across uploads don't overwrite each other.
 */
export async function uploadInlineImage(
  supabase: SupabaseClient,
  opts: UploadOpts
): Promise<string> {
  const kind = opts.kind ?? 'inline';
  const safeName = sanitiseFilename(opts.filename);
  const path = `${kind}/${opts.postId}/${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(BLOG_BUCKET)
    .upload(path, opts.buffer, {
      contentType: opts.contentType,
      cacheControl: '31536000',  // 1 year — assets are content-addressed by post id
      upsert: true,
    });
  if (upErr) throw upErr;

  const { data } = supabase.storage.from(BLOG_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Used by the standalone image-upload endpoint (cover images). */
export async function uploadCoverImage(
  supabase: SupabaseClient,
  opts: Omit<UploadOpts, 'kind'>
): Promise<string> {
  return uploadInlineImage(supabase, { ...opts, kind: 'covers' });
}

function sanitiseFilename(name: string): string {
  // Strip path separators, normalise spaces, keep a single extension.
  const cleaned = name
    .replace(/[/\\]/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || `asset-${Date.now()}`;
}
