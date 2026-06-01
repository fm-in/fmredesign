'use client';

/**
 * Homepage section that introduces FM Academy / Creator Program.
 *
 * Frames the academy as "we teach what we do here" — agency-led, in-person,
 * 45 days. Six course chips, batch-start urgency, single primary CTA to
 * /academy and a secondary "see the bundle" CTA. Dark-theme V2 styling.
 *
 * Lives below the fold and is dynamically imported from `src/app/page.tsx`
 * so it doesn't bloat the initial homepage bundle.
 */

import Link from 'next/link';
import {
  ArrowRight, GraduationCap, Sparkles, Megaphone, BarChart3,
  Palette, Video, Film, Globe, CheckCircle2,
} from 'lucide-react';

const COURSE_CHIPS = [
  { name: 'Digital Marketing',   icon: Megaphone, slug: 'digital-marketing' },
  { name: 'Performance Marketing', icon: BarChart3, slug: 'performance-marketing' },
  { name: 'Graphic Designing',   icon: Palette,   slug: 'graphic-design' },
  { name: 'Video Editing',       icon: Video,     slug: 'video-editing' },
  { name: 'AI Filmmaking',       icon: Film,      slug: 'ai-filmmaking' },
  { name: 'Website Designing',   icon: Globe,     slug: 'website-designing' },
];

// Hardcoded for the current cohort. When we add more batches, lift this
// out into a fetch from /api/academy/programs or generateStaticProps.
const BATCH_START = '5 June 2026';
const BUNDLE_PRICE = '₹1,29,999';
const BUNDLE_REGULAR = '₹1,49,999';

export function AcademySectionV2() {
  return (
    <section className="v2-section relative overflow-hidden">
      <div className="v2-container">
        {/* ── Header ───────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto mb-16" style={{ textAlign: 'center' }}>
          <div className="v2-badge v2-badge-glass mb-6 inline-flex">
            <GraduationCap className="w-4 h-4 v2-text-primary" />
            <span className="v2-text-primary">FM Academy &middot; Now Enrolling</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold v2-text-primary mb-6 leading-[1.05]">
            Now teaching what <span className="v2-accent">we do every day</span>.
          </h2>
          <p className="text-lg md:text-xl v2-text-secondary leading-relaxed">
            The Freaking Minds Creator Program — six in-person courses by the
            team running real brand campaigns. 45 days. Bhopal studio. New batch starts{' '}
            <strong className="v2-text-primary">{BATCH_START}</strong>.
          </p>
        </div>

        {/* ── Course chip grid ─────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-12 max-w-5xl mx-auto">
          {COURSE_CHIPS.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.slug}
                href={`/academy/${c.slug}`}
                className="group relative flex flex-col items-center gap-3 px-4 py-5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-fm-magenta-400/50 hover:bg-white/10 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-fm-magenta-500 to-fm-purple-600 flex items-center justify-center shadow-lg shadow-fm-magenta-500/20 group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium v2-text-primary text-center leading-tight">
                  {c.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* ── Bundle highlight card ────────────────────────── */}
        <div className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden bg-gradient-to-br from-fm-magenta-700 via-fm-magenta-600 to-fm-purple-700 p-8 md:p-12">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.6),transparent_50%)]" />

          <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
            <div className="lg:col-span-3 space-y-5 text-white">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                Best value &middot; All 6 courses
              </div>
              <h3 className="font-display text-3xl md:text-4xl font-bold leading-tight">
                The full Creator Program
              </h3>
              <p className="text-white/85 text-base md:text-lg leading-relaxed">
                Take every course in one batch. Cross-module projects, a single
                integrated certificate, and you save ₹30,000 vs buying them
                individually.
              </p>

              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/85 pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> 45-day in-person batch
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Small batch — 15 seats
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Live brand briefs
                </span>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4 lg:text-right">
              <div className="space-y-1">
                <div className="text-white/70 text-xs uppercase tracking-wider font-semibold">
                  Early-bird price
                </div>
                <div className="flex items-baseline gap-3 lg:justify-end">
                  <span className="text-4xl md:text-5xl font-bold text-white">{BUNDLE_PRICE}</span>
                  <span className="text-white/60 line-through text-lg">{BUNDLE_REGULAR}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-end">
                <Link
                  href="/academy/creator-program-full"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-fm-magenta-700 font-semibold hover:translate-x-1 transition-transform"
                >
                  Reserve a bundle seat
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/academy"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors font-medium"
                >
                  See all courses
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
