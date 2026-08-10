/**
 * Blog listing — client component (search + category filter on the
 * client). Receives the published posts list pre-fetched from Supabase
 * by the parent server component (src/app/blog/page.tsx).
 */

'use client';

import { useState, useMemo } from 'react';
import {
  ArrowRight, Search, TrendingUp, Lightbulb, Target, BookOpen, Star, Clock, User, Tag, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { V2PageWrapper } from '@/components/layouts/V2PageWrapper';
import { CalButton } from '@/components/ui/CalButton';
import type { PublicPost } from '@/lib/blog-data-public';

const categoryGradients: Record<string, string> = {
  'Strategy': 'v2-gradient-brand',
  'SEO': 'v2-gradient-seo',
  'Social Media': 'v2-gradient-social',
  'Content Marketing': 'v2-gradient-content',
  'Web Design': 'v2-gradient-deep',
  'Analytics': 'v2-gradient-performance',
  'Marketing': 'v2-gradient-brand',
  'Design': 'v2-gradient-content',
  'AI': 'v2-gradient-deep',
  'Performance': 'v2-gradient-performance',
  'Brand': 'v2-gradient-brand',
  'Web': 'v2-gradient-deep',
  'Case Studies': 'v2-gradient-content',
};

const categoryIcons: Record<string, typeof TrendingUp> = {
  'Strategy': Target,
  'SEO': Search,
  'Social Media': Star,
  'Content Marketing': BookOpen,
  'Web Design': Lightbulb,
  'Analytics': TrendingUp,
  'Marketing': TrendingUp,
  'Design': Lightbulb,
  'AI': Star,
  'Performance': TrendingUp,
  'Brand': Lightbulb,
  'Web': Lightbulb,
  'Case Studies': BookOpen,
};

interface BlogListingClientProps {
  posts: PublicPost[];
  categories: string[];
  tags: string[];
}

export default function BlogListingClient({ posts, categories, tags }: BlogListingClientProps) {
  const [activeCategory, setActiveCategory] = useState('All Posts');
  const [searchQuery, setSearchQuery] = useState('');

  const featuredPost = posts.find((p) => p.featured) || posts[0];
  const regularPosts = featuredPost ? posts.filter((p) => p.slug !== featuredPost.slug) : posts;

  const filteredPosts = useMemo(() => {
    let list = regularPosts;
    if (activeCategory !== 'All Posts') {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeCategory, searchQuery, regularPosts]);

  if (posts.length === 0) {
    return (
      <V2PageWrapper>
        <section className="relative z-10 v2-section pt-40 pb-32">
          <div className="v2-container v2-container-narrow" style={{ textAlign: 'center' }}>
            <BookOpen className="w-12 h-12 text-fm-neutral-300 mx-auto mb-4" />
            <h1 className="font-display text-3xl font-bold v2-text-primary mb-3">Blog launching soon</h1>
            <p className="v2-text-secondary mb-6">
              We&rsquo;re writing our first set of posts. Check back shortly or get in touch.
            </p>
            <Link href="/contact" className="v2-btn v2-btn-primary">Get in touch</Link>
          </div>
        </section>
      </V2PageWrapper>
    );
  }

  return (
    <V2PageWrapper>
      {/* Hero */}
      <section className="relative z-10 v2-section pt-40">
        <div className="v2-container v2-container-wide">
          <div className="max-w-4xl mx-auto" style={{ textAlign: 'center' }}>
            <div className="v2-badge v2-badge-glass mb-8">
              <BookOpen className="w-4 h-4 v2-text-primary" />
              <span className="v2-text-primary">Expert Insights & Industry Knowledge</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-5xl lg:text-6xl xl:text-7xl font-bold v2-text-primary mb-8 leading-tight">
              Marketing <span className="v2-accent">Insights</span> That Drive Results
            </h1>
            <p className="text-lg md:text-xl v2-text-secondary leading-relaxed" style={{ marginBottom: '48px' }}>
              Stay ahead of the curve with expert insights, proven strategies, and actionable tips from our team of marketing and creative professionals.
            </p>

            <div className="max-w-md mx-auto relative mb-10">
              <div className="v2-paper-sm rounded-xl p-1">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-fm-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search articles..."
                    className="w-full transition-all duration-200"
                    style={{
                      padding: '14px 16px 14px 48px',
                      background: '#faf9f9',
                      border: '1.5px solid #e5e2e2',
                      borderRadius: '12px',
                      outline: 'none',
                      fontSize: '15px',
                      color: '#0f0f0f',
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="#posts" className="v2-btn v2-btn-primary">
                Browse Articles
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/get-started" className="v2-btn v2-btn-secondary">
                Get Marketing Help
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute left-8 lg:left-20 top-1/3 hidden lg:block" style={{ zIndex: 10 }}>
          <Image
            src="/3dasset/brain-learning.webp"
            alt="Learning & Insights"
            width={180}
            height={180}
            loading="lazy"
            className="h-auto animate-v2-hero-float"
            style={{ width: 'min(180px, 30vw)', height: 'auto', filter: 'drop-shadow(0 20px 40px rgba(140,25,60,0.2))' }}
          />
        </div>
      </section>

      {/* Featured */}
      {featuredPost && (
        <section className="relative z-10 v2-section">
          <div className="v2-container">
            <Link
              href={`/blog/${featuredPost.slug}`}
              className="group relative block v2-paper-lg rounded-3xl overflow-hidden hover:shadow-3xl transition-all duration-500"
            >
              <div className="grid lg:grid-cols-2">
                <div className={`relative ${categoryGradients[featuredPost.category] || 'v2-gradient-brand'} p-8 lg:p-12 min-h-[240px] md:min-h-[300px] lg:min-h-[400px] flex items-center justify-center`}>
                  {featuredPost.coverImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={featuredPost.coverImage} alt={featuredPost.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <>
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-8 left-8 w-40 h-40 border border-white/30 rounded-full" />
                        <div className="absolute bottom-8 right-8 w-28 h-28 border border-white/20 rounded-full" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/10 rounded-full" />
                      </div>
                      <div className="relative" style={{ textAlign: 'center' }}>
                        <TrendingUp className="w-24 h-24 mx-auto mb-4 text-white/90" />
                        <p className="text-white/90 text-lg font-medium">Featured Article</p>
                      </div>
                    </>
                  )}
                  <div className="absolute top-6 left-6 v2-tag v2-tag-overlay z-10">
                    {featuredPost.category}
                  </div>
                </div>

                <div className="p-8 lg:p-12 flex flex-col justify-center">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="v2-tag v2-tag-magenta">Featured</span>
                    <span className="flex items-center gap-1 text-fm-neutral-500 text-sm">
                      <Clock className="w-4 h-4" />
                      {featuredPost.readTime}
                    </span>
                  </div>
                  <h2 className="font-display text-2xl lg:text-3xl font-bold text-fm-neutral-900 mb-4 group-hover:text-fm-magenta-700 transition-colors">
                    {featuredPost.title}
                  </h2>
                  <p className="text-lg text-fm-neutral-600 mb-6 leading-relaxed">{featuredPost.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-fm-magenta-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-fm-magenta-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-fm-neutral-900">{featuredPost.author}</div>
                        <div className="text-sm text-fm-neutral-500">
                          {new Date(featuredPost.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-2 text-fm-magenta-600 font-semibold group-hover:text-fm-magenta-700 transition-colors">
                      Read Article
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Grid + sidebar */}
      <section id="posts" className="relative z-10 v2-section">
        <div className="v2-container v2-container-wide">
          <div className="grid lg:grid-cols-4 gap-8 lg:gap-12">
            <div className="lg:col-span-3">
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-12">
                <button
                  onClick={() => setActiveCategory('All Posts')}
                  className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                    activeCategory === 'All Posts'
                      ? 'bg-fm-magenta-600 text-white shadow-lg'
                      : 'bg-fm-neutral-100 text-fm-neutral-600 hover:bg-fm-neutral-200 hover:text-fm-neutral-900'
                  }`}
                >
                  All Posts ({posts.length})
                </button>
                {categories.map((category) => {
                  const count = posts.filter((p) => p.category === category).length;
                  return (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                        activeCategory === category
                          ? 'bg-fm-magenta-600 text-white shadow-lg'
                          : 'bg-fm-neutral-100 text-fm-neutral-600 hover:bg-fm-neutral-200 hover:text-fm-neutral-900'
                      }`}
                    >
                      {category} ({count})
                    </button>
                  );
                })}
              </div>

              {filteredPosts.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                  {filteredPosts.map((post) => {
                    const gradient = categoryGradients[post.category] || 'v2-gradient-brand';
                    const Icon = categoryIcons[post.category] || Lightbulb;
                    return (
                      <article
                        key={post.slug}
                        className="group v2-paper rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-500 hover:-translate-y-2"
                      >
                        <Link href={`/blog/${post.slug}`}>
                          <div className={`relative ${gradient} p-6 h-32 sm:h-40 flex items-center justify-center overflow-hidden`}>
                            {post.coverImage ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={post.coverImage} alt={post.title} className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                              <Icon className="w-10 sm:w-12 h-10 sm:h-12 text-white/80" />
                            )}
                            <div className="absolute top-4 left-4 v2-tag v2-tag-overlay z-10">{post.category}</div>
                          </div>
                          <div className="p-6">
                            <div className="flex items-center gap-3 mb-3 text-sm text-fm-neutral-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {post.readTime}
                              </span>
                              <span>&bull;</span>
                              <span>{new Date(post.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <h3 className="font-display text-xl font-bold text-fm-neutral-900 mb-3 group-hover:text-fm-magenta-700 transition-colors line-clamp-2">
                              {post.title}
                            </h3>
                            <p className="text-fm-neutral-600 text-sm mb-4 line-clamp-2">{post.excerpt}</p>
                            <div className="flex flex-wrap gap-2 mb-4">
                              {post.tags.slice(0, 2).map((tag) => (
                                <span key={tag} className="v2-tag v2-tag-neutral">{tag}</span>
                              ))}
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-fm-neutral-100">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-fm-magenta-100 rounded-full flex items-center justify-center">
                                  <User className="w-4 h-4 text-fm-magenta-600" />
                                </div>
                                <span className="text-sm font-medium text-fm-neutral-700">{post.author}</span>
                              </div>
                              <span className="text-fm-magenta-600 text-sm font-semibold group-hover:text-fm-magenta-700 flex items-center gap-1">
                                Read
                                <ChevronRight className="w-4 h-4" />
                              </span>
                            </div>
                          </div>
                        </Link>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="v2-paper rounded-2xl p-12" style={{ textAlign: 'center' }}>
                  <Lightbulb className="w-12 h-12 text-fm-neutral-300 mx-auto mb-4" />
                  <h3 className="font-display text-xl font-bold text-fm-neutral-900 mb-2">No articles found</h3>
                  <p className="text-fm-neutral-600 text-sm leading-relaxed">
                    Try adjusting your search or filter to find what you&apos;re looking for.
                  </p>
                </div>
              )}
            </div>

            <div className="lg:col-span-1 space-y-8">
              <div className="v2-paper rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-fm-neutral-900 mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-fm-magenta-600" />
                  Popular Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSearchQuery(tag)}
                      className="v2-tag v2-tag-neutral cursor-pointer"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="v2-paper rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-fm-neutral-900 mb-4">Recent Posts</h3>
                <div className="space-y-4">
                  {posts.slice(0, 3).map((post) => {
                    const gradient = categoryGradients[post.category] || 'v2-gradient-brand';
                    const Icon = categoryIcons[post.category] || Lightbulb;
                    return (
                      <Link key={post.slug} href={`/blog/${post.slug}`} className="flex gap-3 group">
                        <div className={`w-16 h-16 ${gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-6 h-6 text-white/80" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-fm-neutral-900 line-clamp-2 mb-1 group-hover:text-fm-magenta-600 transition-colors">
                            {post.title}
                          </h4>
                          <p className="text-xs text-fm-neutral-500">
                            {new Date(post.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 v2-section pb-32">
        <div className="v2-container v2-container-narrow">
          <div className="v2-paper rounded-3xl p-10 lg:p-14" style={{ textAlign: 'center' }}>
            <div className="v2-badge v2-badge-light mb-6">
              <Target className="w-4 h-4" />
              <span>Ready to Take Action?</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-fm-neutral-900 mb-6 leading-tight">
              Ready to Implement These <span className="text-fm-magenta-600">Strategies</span>?
            </h2>
            <p className="text-fm-neutral-600 mb-8 max-w-xl mx-auto">
              Turn insights into action with our expert team. We&rsquo;ll help you implement proven strategies that drive real business results.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/get-started" className="v2-btn v2-btn-magenta">
                Get Expert Marketing Help
                <ArrowRight className="w-5 h-5" />
              </Link>
              <CalButton calLink="fm-in/15min" className="v2-btn v2-btn-outline">
                Schedule a Call
              </CalButton>
            </div>
          </div>
        </div>
      </section>
    </V2PageWrapper>
  );
}
