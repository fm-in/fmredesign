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
import { V2PageWrapper } from '@/components/layouts/V2PageWrapper';
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
    <V2PageWrapper>
      {/* Hero */}
      <section className="relative z-10 v2-section pt-40">
        <div className="v2-container v2-container-narrow">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 v2-text-secondary hover:v2-text-primary transition-colors mb-8 text-sm py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          <div className="v2-badge v2-badge-glass mb-6">
            <Tag className="w-4 h-4 v2-text-primary" />
            <span className="v2-text-primary">{post.category}</span>
          </div>

          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold v2-text-primary mb-6 leading-tight">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 v2-text-secondary text-sm mb-6">
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
                  className="px-3 py-1 rounded-full text-xs font-medium v2-text-secondary"
                  style={{ background: 'rgba(201, 50, 93, 0.08)' }}
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
              className="w-full aspect-[16/9] object-cover rounded-3xl mt-2 mb-6 shadow-2xl"
            />
          )}
        </div>
      </section>

      {/* Article body */}
      <section className="relative z-10 v2-section pt-0">
        <div className="v2-container v2-container-narrow">
          <div className="v2-paper-lg rounded-3xl p-8 md:p-12 lg:p-16">
            <div
              className="prose prose-lg max-w-none lg:max-w-3xl lg:mx-auto blog-body"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            <div className="mt-12 pt-8 border-t border-fm-neutral-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <span className="flex items-center gap-2 text-fm-neutral-700 font-semibold">
                  <Share2 className="w-5 h-5" />
                  Share this article
                </span>
                <div className="flex gap-3">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-fm-neutral-100 text-fm-neutral-700 rounded-full text-sm font-medium hover:bg-fm-magenta-50 hover:text-fm-magenta-600 transition-all"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-fm-neutral-100 text-fm-neutral-700 rounded-full text-sm font-medium hover:bg-fm-magenta-50 hover:text-fm-magenta-600 transition-all"
                  >
                    LinkedIn
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-fm-neutral-100 text-fm-neutral-700 rounded-full text-sm font-medium hover:bg-fm-magenta-50 hover:text-fm-magenta-600 transition-all"
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
        <section className="relative z-10 v2-section">
          <div className="v2-container v2-container-narrow">
            <h2 className="font-display text-2xl md:text-3xl font-bold v2-text-primary mb-8">
              Related Articles
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="group v2-paper rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="v2-tag v2-tag-magenta">{r.category}</span>
                    <span className="text-fm-neutral-500 text-xs">{r.readTime}</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-fm-neutral-900 mb-2 group-hover:text-fm-magenta-700 transition-colors line-clamp-2">
                    {r.title}
                  </h3>
                  <p className="text-fm-neutral-600 text-sm line-clamp-2">{r.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative z-10 v2-section pb-32">
        <div className="v2-container v2-container-narrow">
          <div className="v2-paper rounded-3xl p-10 lg:p-14" style={{ textAlign: 'center' }}>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-fm-neutral-900 mb-6 leading-tight">
              Ready to Grow Your <span className="text-fm-magenta-600">Business</span>?
            </h2>
            <p className="text-fm-neutral-600 mb-8 max-w-xl mx-auto">
              Turn these insights into action. Our team can help you implement proven strategies that drive real results.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/get-started" className="v2-btn v2-btn-magenta">
                Get a Free Consultation
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/contact" className="v2-btn v2-btn-outline">
                Talk to Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </V2PageWrapper>
  );
}
