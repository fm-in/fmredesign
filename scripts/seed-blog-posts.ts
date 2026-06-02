/**
 * Seed the 6 hardcoded blog posts from src/lib/blog-data.ts into the new
 * `blog_posts` table. Idempotent — UPSERT on slug. Run once after the
 * migration is applied:
 *
 *   npx tsx scripts/seed-blog-posts.ts
 *
 * After verifying /blog still works, src/lib/blog-data.ts can be deleted.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { marked } from 'marked';
import { generateJSON } from '@tiptap/html/server';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
// StarterKit v3 ships Link — don't double-import @tiptap/extension-link.
import {
  generatePostId,
  slugify,
  countWordsInHtml,
  estimateReadMinutes,
} from '../src/lib/admin/blog-types';
import { blogPosts } from '../src/lib/blog-data';

config({ path: '.env.local' });
config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TIPTAP_EXT = [StarterKit, Image];

/** Convert the hardcoded readTime ("5 min read") to minutes integer. */
function readMinutesFromString(s: string): number {
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 5;
}

/** Parse the legacy `YYYY-MM-DD` (or "January 15, 2026") date string into ISO. */
function toIso(dateStr: string): string {
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString();
  // Fall back to today if unparseable
  return new Date().toISOString();
}

async function main() {
  console.log(`Seeding ${blogPosts.length} legacy posts into blog_posts…\n`);

  const rows = await Promise.all(
    blogPosts.map(async (p) => {
      const html = (await marked.parse(p.content, { gfm: true, breaks: false })) as string;
      const json = generateJSON(html, TIPTAP_EXT);
      const wc = countWordsInHtml(html);
      const readMin = readMinutesFromString(p.readTime) || estimateReadMinutes(wc);

      return {
        id: generatePostId(),
        slug: p.slug,             // preserve original URL
        title: p.title,
        excerpt: p.excerpt,
        body_html: html,
        body_tiptap: json,
        word_count: wc,
        read_minutes: readMin,
        tags: p.tags.map((name) => ({ name, slug: slugify(name) })),
        category: p.category,
        author_name: p.author,
        featured: !!p.featured,
        status: 'published' as const,
        published_at: toIso(p.date),
        source: 'seeded' as const,
        ai_assisted: false,
      };
    })
  );

  const { error } = await supabase
    .from('blog_posts')
    .upsert(rows, { onConflict: 'slug' });

  if (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }

  for (const r of rows) {
    console.log(`  ✓ ${r.title}`);
    console.log(`      /blog/${r.slug}  (${r.word_count} words, ${r.read_minutes} min)`);
  }
  console.log(`\nDone. ${rows.length} posts published.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
