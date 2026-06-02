/**
 * Blog upload parsers — convert .docx and .md into a normalised
 * { html, json, plainText, meta, images } payload that the rest of the
 * pipeline (AI assist, Supabase Storage upload, DB insert) consumes.
 *
 * Both formats end up as HTML first, then we run a single
 * `htmlToTiptapJson` pass so the editor source of truth is consistent.
 */

import mammoth from 'mammoth';
import { marked } from 'marked';
import matter from 'gray-matter';
import { generateJSON } from '@tiptap/html/server';
import StarterKit from '@tiptap/starter-kit';
// NB: StarterKit v3 ships Link — adding @tiptap/extension-link separately
// causes "Duplicate extension names found: ['link']" warnings.
import Image from '@tiptap/extension-image';
import { countWordsInHtml, estimateReadMinutes, slugify, type PostTag } from './blog-types';

export interface ParsedImage {
  /** Stable name with extension (e.g. `image-1.png`). */
  filename: string;
  contentType: string;
  /** Raw bytes — caller uploads to Supabase Storage and rewrites the
   *  HTML/JSON `src` to the public URL. */
  buffer: Buffer;
  /** Placeholder src we wrote into the HTML/JSON (e.g. `__INLINE_IMG_1__`). */
  placeholder: string;
}

export interface ParsedDocMeta {
  title?: string;
  excerpt?: string;
  coverImageUrl?: string;
  tags?: PostTag[];
  category?: string;
  authorName?: string;
  publishedAt?: string;
}

export interface ParsedDoc {
  html: string;
  json: Record<string, unknown>;
  plainText: string;
  wordCount: number;
  readMinutes: number;
  meta: ParsedDocMeta;
  images: ParsedImage[];
  warnings: string[];
}

/** TipTap extensions used to round-trip HTML ↔ JSON. Keep this list in
 *  sync with the editor component so what we generate here is editable
 *  without losing nodes. */
const TIPTAP_EXTENSIONS = [StarterKit, Image];

/** Strip HTML tags to a plain-text representation for AI assist. */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<\/(?:p|h[1-6]|li|blockquote|div|br)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Best-guess image extension from a content-type. */
function extFromContentType(ct: string): string {
  const m = ct.match(/image\/([a-z0-9+]+)/i);
  if (!m) return 'png';
  const sub = m[1].toLowerCase();
  if (sub === 'jpeg') return 'jpg';
  if (sub === 'svg+xml') return 'svg';
  return sub;
}

/** Lift the first <h1> out of a body and use it as the title when no
 *  frontmatter title was provided. Returns { titleFromBody, htmlWithoutH1 } */
function liftFirstH1(html: string): { title?: string; html: string } {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return { html };
  const title = m[1].replace(/<[^>]+>/g, '').trim();
  if (!title) return { html };
  const stripped = html.replace(m[0], '').trim();
  return { title, html: stripped };
}

// ─────────────────────────────────────────────────────────────────────────
// parseDocx — Word documents via mammoth
// ─────────────────────────────────────────────────────────────────────────
export async function parseDocx(buffer: Buffer): Promise<ParsedDoc> {
  const images: ParsedImage[] = [];
  let imageCounter = 0;

  // Mammoth lets us intercept inline images and swap their <img src=...>
  // for a placeholder we'll rewrite after Storage upload.
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        imageCounter += 1;
        const contentType = image.contentType || 'image/png';
        const ext = extFromContentType(contentType);
        const filename = `image-${imageCounter}.${ext}`;
        const placeholder = `__INLINE_IMG_${imageCounter}__`;
        const buf = await image.read();
        images.push({
          filename,
          contentType,
          buffer: Buffer.isBuffer(buf) ? buf : Buffer.from(buf as unknown as ArrayBuffer),
          placeholder,
        });
        return { src: placeholder };
      }),
    }
  );

  const lifted = liftFirstH1(result.value);
  const html = lifted.html;
  const plainText = htmlToPlainText(html);
  const wordCount = countWordsInHtml(html);
  const json = generateJSON(html, TIPTAP_EXTENSIONS);

  return {
    html,
    json: json as Record<string, unknown>,
    plainText,
    wordCount,
    readMinutes: estimateReadMinutes(wordCount),
    meta: { title: lifted.title },
    images,
    warnings: result.messages
      .filter((m) => m.type === 'warning' || m.type === 'error')
      .map((m) => m.message),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// parseMarkdown — Markdown with frontmatter via gray-matter + marked
// ─────────────────────────────────────────────────────────────────────────
export async function parseMarkdown(raw: string): Promise<ParsedDoc> {
  const { data, content } = matter(raw);

  // marked.parse can return a Promise depending on options; await is safe.
  const html = await marked.parse(content, {
    gfm: true,
    breaks: false,
  });

  const lifted = liftFirstH1(html as string);
  const finalHtml = lifted.html;
  const plainText = htmlToPlainText(finalHtml);
  const wordCount = countWordsInHtml(finalHtml);
  const json = generateJSON(finalHtml, TIPTAP_EXTENSIONS);

  // Pull standard frontmatter keys. Tolerate either `tags: [a, b]` or
  // `tags: "a, b"` shapes — both are common in Markdown authoring.
  const tags = normaliseTags(data.tags);

  return {
    html: finalHtml,
    json: json as Record<string, unknown>,
    plainText,
    wordCount,
    readMinutes: estimateReadMinutes(wordCount),
    meta: {
      title: (data.title as string) || lifted.title,
      excerpt: (data.excerpt as string) || (data.description as string) || undefined,
      coverImageUrl: (data.cover as string) || (data.cover_image as string) || (data.image as string) || undefined,
      tags,
      category: (data.category as string) || undefined,
      authorName: (data.author as string) || undefined,
      publishedAt: (data.date as string) || (data.published_at as string) || undefined,
    },
    images: [],   // Markdown inline images are URL-referenced, not embedded
    warnings: [],
  };
}

function normaliseTags(input: unknown): PostTag[] | undefined {
  if (!input) return undefined;
  if (Array.isArray(input)) {
    return input
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      .map((name) => ({ name: name.trim(), slug: slugify(name) }));
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name, slug: slugify(name) }));
  }
  return undefined;
}

/**
 * After uploading each inline image to Supabase Storage, the caller hands
 * us a map of `placeholder → public URL` and we rewrite both HTML and the
 * TipTap JSON so the editor and the public render both point to Storage.
 */
export function replaceImagePlaceholders(
  doc: ParsedDoc,
  urls: Record<string, string>
): ParsedDoc {
  let html = doc.html;
  for (const [placeholder, url] of Object.entries(urls)) {
    html = html.split(placeholder).join(url);
  }
  // Walk the TipTap JSON tree and replace any image node whose `src`
  // matches a placeholder.
  const json = JSON.parse(JSON.stringify(doc.json)) as Record<string, unknown>;
  walkTiptapImages(json, (src) => urls[src] ?? src);

  return { ...doc, html, json };
}

function walkTiptapImages(
  node: Record<string, unknown>,
  rewrite: (src: string) => string
): void {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'image' && node.attrs && typeof node.attrs === 'object') {
    const attrs = node.attrs as { src?: string };
    if (attrs.src) attrs.src = rewrite(attrs.src);
  }
  const content = node.content as unknown;
  if (Array.isArray(content)) {
    for (const child of content) {
      if (child && typeof child === 'object') {
        walkTiptapImages(child as Record<string, unknown>, rewrite);
      }
    }
  }
}
