/**
 * Blog post — client component that renders the supplied post + related
 * list. Body comes in as pre-rendered HTML (from the CMS upload pipeline),
 * so this no longer carries a Markdown renderer.
 */

'use client';

import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Clock, User, Tag, Calendar, Share2,
} from 'lucide-react';
import { SiteShell } from '@/components/site/SiteShell';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import type { PublicPost } from '@/lib/blog-data-public';

interface BlogPostClientProps {
  post: PublicPost;
  related: PublicPost[];
}

export default function BlogPostClient({ post, related }: BlogPostClientProps) {
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `${post.title} - FreakingMinds Blog`;
  const formattedDate = new Date(post.date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <SiteShell>
      <SiteHeader />
      <main id="main-content">
      {/* Hero */}
      <section className="relative z-10 py-site-section pt-40">
        <div className="site-measure site-measure--narrow">
          <Link
            href="/freakquency"
            className="inline-flex items-center gap-2 text-site-muted hover:text-site-text transition-colors mb-8 text-sm py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Freakquency
          </Link>

          <div className="eyebrow">
              <span className="tag">{post.category}</span>
            </div>

          <h1 className="font-site-display text-3xl md:text-4xl lg:text-5xl font-bold text-site-text mb-6 leading-tight">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-site-muted text-sm mb-6">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {post.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {post.readTime}
            </span>
          </div>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-8">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs font-medium text-site-muted"
                  style={{ background: 'color-mix(in srgb, var(--site-accent) 0.0800%, transparent)' }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {post.coverImage && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full aspect-[16/9] object-cover rounded-site-lg mt-2 mb-6"
            />
          )}
        </div>
      </section>

      {/* Article body */}
      <section className="relative z-10 py-site-section pt-0">
        <div className="site-measure site-measure--narrow">
          <div className="site-surface rounded-site-lg p-6 md:p-8">
            <div
              /* `prose prose-lg` were inert — @tailwindcss/typography is not
                 installed. `max-w-none` also beat the measure set by
                 .blog-body, since Tailwind utilities outrank @layer
                 components. Typography now lives entirely in the CSS. */
              className="blog-body"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            <div className="mt-12 pt-8 border-t border-site-line">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <span className="flex items-center gap-2 text-site-text font-semibold">
                  <Share2 className="w-5 h-5" />
                  Share this article
                </span>
                <div className="flex gap-3">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-site-raised text-site-text rounded-full text-sm font-medium hover:bg-site-raised hover:text-site-accent transition-all"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-site-raised text-site-text rounded-full text-sm font-medium hover:bg-site-raised hover:text-site-accent transition-all"
                  >
                    LinkedIn
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-site-raised text-site-text rounded-full text-sm font-medium hover:bg-site-raised hover:text-site-accent transition-all"
                  >
                    Twitter
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="relative z-10 py-site-section">
          <div className="site-measure site-measure--narrow">
            <h2 className="font-site-display text-2xl md:text-3xl font-bold text-site-text mb-8">
              Related Articles
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/freakquency/${r.slug}`}
                  className="group site-surface rounded-site-lg p-6 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="tag">{r.category}</span>
                    <span className="text-site-muted text-xs">{r.readTime}</span>
                  </div>
                  <h3 className="font-site-display text-lg font-bold text-site-text mb-2 group-hover:text-site-accent transition-colors line-clamp-2">
                    {r.title}
                  </h3>
                  <p className="text-site-muted text-sm line-clamp-2">{r.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative z-10 py-site-section pb-32">
        <div className="site-measure site-measure--narrow">
          <div className="site-surface rounded-site-lg p-10 lg:p-6 md:p-8">
            <h2 className="font-site-display text-3xl md:text-4xl font-bold text-site-text mb-6 leading-tight">
              Ready to Grow Your <span className="text-site-accent">Business</span>?
            </h2>
            <p className="text-site-muted mb-8 lay-measure">
              Turn these insights into action. Our team can help you implement proven strategies that drive real results.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/get-started" className="btn btn--primary">
                Get a Free Consultation
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/contact" className="btn btn--ghost">
                Talk to Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
      <SiteFooter />
    </SiteShell>
  );
}
