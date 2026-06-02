/**
 * Polish the 6 seeded blog posts: generate SEO title + description via
 * Groq (Llama 3.3 70B) for each, and mark the Bhopal anchor article as
 * featured. Author-chosen title/excerpt/category/tags are NEVER touched
 * — only blank SEO fields get filled.
 *
 *   npx tsx scripts/format-seeded-blogs.ts
 *
 * Re-runnable: skips posts that already have SEO fields populated.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { suggestPostMetadata } from '../src/lib/admin/blog-ai-assist';

config({ path: '.env.local' });
config({ path: '.env' });

const FEATURED_SLUG = 'why-every-business-in-bhopal-needs-digital-marketing-strategy';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Strip HTML to feed plain text into the AI. */
function htmlToText(html: string): string {
  return html
    .replace(/<\/(?:p|h[1-6]|li|div|br)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function main() {
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id,slug,title,excerpt,category,seo_title,seo_description,body_html,featured')
    .eq('source', 'seeded');

  if (error) {
    console.error('Fetch failed:', error);
    process.exit(1);
  }

  console.log(`Processing ${posts?.length || 0} seeded posts…\n`);

  for (const p of posts || []) {
    const needsSeo = !p.seo_title || !p.seo_description;
    const needsFeatured = p.slug === FEATURED_SLUG && !p.featured;

    if (!needsSeo && !needsFeatured) {
      console.log(`✓ ${p.slug} — already polished, skipping`);
      continue;
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (needsSeo) {
      const text = htmlToText(p.body_html || '');
      const suggestion = await suggestPostMetadata({
        text,
        hintedTitle: p.title as string,
      });
      // ONLY take SEO fields — don't overwrite the author's title / excerpt /
      // category / tags, which were intentional curation.
      if (!p.seo_title && suggestion.seoTitle) {
        updates.seo_title = suggestion.seoTitle;
      }
      if (!p.seo_description && suggestion.seoDescription) {
        updates.seo_description = suggestion.seoDescription;
      }
    }

    if (needsFeatured) {
      updates.featured = true;
    }

    if (Object.keys(updates).length === 1) {
      console.log(`⚠ ${p.slug} — AI returned no usable SEO suggestions, skipping`);
      continue;
    }

    const { error: updateErr } = await supabase
      .from('blog_posts')
      .update(updates)
      .eq('id', p.id);

    if (updateErr) {
      console.error(`✗ ${p.slug} — update failed:`, updateErr);
      continue;
    }

    console.log(`✓ ${p.slug}`);
    if (updates.seo_title)       console.log(`    seo_title  : ${updates.seo_title}`);
    if (updates.seo_description) console.log(`    seo_desc   : ${updates.seo_description}`);
    if (updates.featured)        console.log(`    featured   : true`);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
