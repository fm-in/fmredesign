'use client';

/**
 * Homepage section that introduces FM Academy / Creator Program.
 *
 * Frames around per-course entry pricing (₹24,999) — not the full bundle
 * (₹1.5L), which was making the homepage section feel expensive at a
 * glance. Six course cards lead the section, each with its own price.
 * A subtle bundle line below the grid mentions the "take all 6 and save"
 * option without dominating the surface.
 *
 * Dark-theme V2 styling, dynamically imported from `src/app/page.tsx`
 * so it doesn't bloat the initial homepage bundle.
 */

import Link from 'next/link';
import {
  ArrowRight, GraduationCap, Sparkles, Megaphone, BarChart3,
  Palette, Video, Film, Globe, Building2, Users, MapPin,
} from 'lucide-react';

const COURSE_CHIPS = [
  { name: 'Digital Marketing',     icon: Megaphone, slug: 'digital-marketing',     gradient: 'from-rose-500/90  to-pink-600/90'   },
  { name: 'Performance Marketing', icon: BarChart3, slug: 'performance-marketing', gradient: 'from-amber-500/90 to-orange-600/90' },
  { name: 'Graphic Designing',     icon: Palette,   slug: 'graphic-design',        gradient: 'from-fuchsia-500/90 to-purple-600/90' },
  { name: 'Video Editing',         icon: Video,     slug: 'video-editing',         gradient: 'from-cyan-500/90  to-sky-600/90'    },
  { name: 'AI Filmmaking',         icon: Film,      slug: 'ai-filmmaking',         gradient: 'from-emerald-500/90 to-teal-600/90' },
  { name: 'Website Designing',     icon: Globe,     slug: 'website-designing',     gradient: 'from-indigo-500/90 to-violet-600/90' },
];

const BATCH_START = '5 June 2026';
const ENTRY_PRICE_EB = '₹24,999';
const ENTRY_PRICE_REGULAR = '₹29,999';

export function AcademySectionV2() {
  return (
    <section className="v2-section relative overflow-hidden">
      <div className="v2-container">
        {/* ── Eyebrow + headline ──────────────────────────────── */}
        <div className="max-w-4xl mx-auto mb-14 lg:mb-16" style={{ textAlign: 'center' }}>
          <div className="v2-badge v2-badge-glass mb-6 inline-flex">
            <GraduationCap className="w-4 h-4 v2-text-primary" />
            <span className="v2-text-primary">FM Academy &middot; New batch starts {BATCH_START}</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold v2-text-primary mb-6 leading-[1.05]">
            Learn the craft <span className="v2-accent">from the people doing it</span>.
          </h2>
          <p className="text-lg v2-text-secondary leading-relaxed max-w-2xl mx-auto">
            The Freaking Minds Creator Program — six in-person courses by the team running real
            brand campaigns. 45 days at our Bhopal studio. Pick one. Or take them all.
          </p>
        </div>

        {/* ── Quick trust strip ───────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-10 text-sm v2-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="w-4 h-4 v2-accent" />
            Agency-led teaching
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-4 h-4 v2-accent" />
            Small batches
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-4 h-4 v2-accent" />
            In-person · Bhopal studio
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 v2-accent" />
            Live brand briefs
          </span>
        </div>

        {/* ── Course grid (6 cards, each with price) ─────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 max-w-6xl mx-auto">
          {COURSE_CHIPS.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.slug}
                href={`/academy/${c.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm hover:bg-white/[0.08] hover:border-white/20 transition-all p-5 md:p-6 flex items-center gap-4"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg font-semibold v2-text-primary truncate">
                    {c.name}
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-base font-semibold v2-accent">{ENTRY_PRICE_EB}</span>
                    <span className="text-xs v2-text-tertiary line-through">{ENTRY_PRICE_REGULAR}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 v2-text-secondary group-hover:v2-text-primary group-hover:translate-x-1 transition-all shrink-0" />
              </Link>
            );
          })}
        </div>

        {/* ── Bundle nudge + primary CTA ───────────────────── */}
        <div className="mt-10 max-w-3xl mx-auto" style={{ textAlign: 'center' }}>
          <p className="v2-text-secondary text-sm md:text-base mb-5">
            Want every craft? The <strong className="v2-text-primary">full Creator Program</strong> bundles all six courses
            for <strong className="v2-text-primary">₹1,29,999</strong> early-bird — save ₹30,000 vs buying individually.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/academy" className="v2-btn v2-btn-primary inline-flex items-center gap-2">
              Explore FM Academy
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/academy/creator-program-full"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-white/20 v2-text-primary hover:bg-white/10 transition-colors font-medium"
            >
              See the bundle
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
