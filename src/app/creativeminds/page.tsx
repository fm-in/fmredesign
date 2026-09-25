'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { TalentApplication } from '@/lib/admin/talent-types';
import { HONEYPOT_FIELD } from '@/lib/spam-guard-field';
import { TalentApplicationForm } from '@/components/public/TalentApplicationForm';
import { SiteShell } from '@/components/site/SiteShell';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { BrainMark } from '@/components/site/BrainMark';

import {
  Palette,
  Code,
  Megaphone,
  PenTool,
  Users,
  Briefcase,
  LineChart,
  Video,
  Camera,
  Type,
  ShieldCheck,
  Zap,
  TrendingUp,
  ArrowRight,
  Globe,
  Check,
} from 'lucide-react';

/* ─── Data ───────────────────────────────────────────────────────── */

const bentoCategories = [
  {
    icon: Palette, name: 'Creative Design', description: 'Visual identity & branding',
  },
  {
    icon: Code, name: 'Development', description: 'Web & app development',
  },
  {
    icon: Video, name: 'Video Production', description: 'Motion graphics & reels',
  },
  {
    icon: PenTool, name: 'Content Creation', description: 'Blogs, scripts & strategy',
  },
  {
    icon: Megaphone, name: 'Digital Marketing', description: 'SEO, PPC & campaigns',
  },
  {
    icon: Users, name: 'Influencer & Social', description: 'Creators & community',
  },
];

const moreCategories = [
  { icon: Camera, name: 'Photography' },
  { icon: Type, name: 'Copywriting' },
  { icon: Briefcase, name: 'Project Management' },
  { icon: LineChart, name: 'Business Consulting' },
];

const processSteps = [
  { step: '01', title: 'Apply.', description: 'Show us your best work. A quick application with your portfolio — that\'s it.' },
  { step: '02', title: 'Get reviewed.', description: 'Our team reviews your portfolio within 48 hours. No algorithms, real humans.' },
  { step: '03', title: 'Start earning.', description: 'Get matched to real brand projects, build your public profile, and get paid.' },
];

const creativeBenefits = [
  {
    icon: Briefcase, title: 'Real Brand Projects', tagline: 'No more cheap gigs.',
    description: 'Work with actual businesses who have real budgets — not someone offering"exposure" as payment.', featured: true,
  },
  {
    icon: ShieldCheck, title: 'No Bidding Wars', tagline: 'Your work speaks for itself.',
    description: 'We match you to projects based on your skills, not who bids lowest. Your portfolio is your pitch.', featured: true,
  },
  {
    icon: Users, title: 'Agency Team Behind You',
    description: 'You\'re not alone. Project managers, creative directors, and a full agency backing your work.', featured: false,
  },
  {
    icon: Globe, title: 'Your Own Profile Page',
    description: 'Get a public talent profile that showcases your work to clients worldwide.', featured: false,
  },
  {
    icon: Zap, title: 'Fast Onboarding',
    description: 'Apply today, get reviewed in 48 hours, start working on projects right away.', featured: false,
  },
  {
    icon: TrendingUp, title: 'Grow With Us',
    description: 'As you deliver great work, you get access to bigger projects and better clients.', featured: false,
  },
];

const talentPerks = [
  { icon: Briefcase, title: 'Real Brand Projects' },
  { icon: Globe, title: 'Public Profile Page' },
  { icon: ShieldCheck, title: 'No Bidding Wars' },
  { icon: Users, title: 'Agency Backing' },
];

/* ─── Page ───────────────────────────────────────────────────────── */

export default function CreativeMindsPage() {
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Intersection observer for bento entrance
  const bentoSectionRef = useRef<HTMLElement>(null);
  const [bentoVisible, setBentoVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setBentoVisible(true); },
      { threshold: 0.1 }
    );
    if (bentoSectionRef.current) observer.observe(bentoSectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handleApplicationSubmit = async (application: TalentApplication, honeypot: string) => {
    const response = await fetch('/api/talent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The decoy sits at the top level: that is where the route reads it.
      body: JSON.stringify({ action: 'submit_application', application, [HONEYPOT_FIELD]: honeypot })
    });
    const result = await response.json();
    if (result.success) {
      setSubmitted(true);
      setShowApplicationForm(false);
    } else {
      throw new Error('Failed to submit application. Please try again.');
    }
  };

  if (showApplicationForm) {
    return (
      <SiteShell>
      <SiteHeader />
      <main id="main-content">
        <section className="sec">
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow">
                <span className="tag tag--a">Join CreativeMinds</span>
              </div>
              <h1 className="d" style={{ fontSize: 'clamp(1.9rem, 3.6vw, 3.2rem)', marginTop: 18 }}>
                Apply to the <span className="text-site-accent">network.</span>
              </h1>
              <p className="lede lay-measure" style={{ marginTop: 20 }}>
                Four quick steps. Our team reviews every application within 48 hours.
              </p>
            </div>

            <TalentApplicationForm
              onSubmit={handleApplicationSubmit}
              onCancel={() => setShowApplicationForm(false)}
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </SiteShell>
    );
  }

  if (submitted) {
    return (
      <SiteShell>
      <SiteHeader />
      <main id="main-content">
        {/* Three `bg-site-raised` boxes nested inside one another used to
            live here — a card, a circle and an inner panel, all #fffdfa, so
            none of them separated from any other. A confirmation is a short
            message; it does not need a full-viewport centred card. */}
        <section className="sec">
          <div className="wrap">
            <div className="lay-rail">
              <div>
                <div className="eyebrow">
                  <span className="tag tag--a">Received</span>
                </div>
              </div>

              <div className="lay-measure">
                <h1 className="d" style={{ fontSize: 'clamp(1.9rem, 3.6vw, 3.2rem)' }}>
                  Application submitted.
                </h1>
                <p className="lede" style={{ marginTop: 'clamp(20px, 2.4vw, 30px)' }}>
                  Thank you for joining the CreativeMinds network. Our team will review your
                  application and come back to you within 48 hours.
                </p>

                <ul className="cap" style={{ listStyle: 'none', padding: 0, margin: '3rem 0 0' }}>
                  {[
                    'Application review, within 24–48 hours',
                    'Portfolio verification',
                    'Welcome to the network, and first project opportunities',
                  ].map((text, i) => (
                    <li key={text} className="cap-row" style={{ gridTemplateColumns: '54px 1fr' }}>
                      <span className="tag n">{String(i + 1).padStart(2, '0')}</span>
                      <span className="cap-name">{text}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-12">
                  <Link href="/" className="btn btn--primary">
                    Visit Freaking Minds
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </SiteShell>
    );
  }

  const featuredBenefits = creativeBenefits.filter(b => b.featured);
  const regularBenefits = creativeBenefits.filter(b => !b.featured);

  return (
    <SiteShell>
      <SiteHeader />
      <main id="main-content">
      {/* ── Hero ────────────────────────────────────────────────────── */}
      {/* `lay-split`, like every other hero on the site. This was a bespoke
          12-column grid with a 7/5 span — the only one in the codebase. */}
      <section className="sec">
        <div className="wrap">
          <div className="lay-split">
            <div>
              <div className="eyebrow">
                <span className="tag tag--a">CreativeMinds by FreakingMinds</span>
              </div>

              <h1 className="d" style={{ maxWidth: '15ch' }}>
                Stop chasing gigs. <span className="text-site-accent">Start creating.</span>
              </h1>

              <p className="lede lay-measure" style={{ marginTop: 'clamp(22px, 2.6vw, 34px)' }}>
                Real clients. Real budgets. No bidding wars. Join a freaking good network of
                creatives backed by an actual agency.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button
                  onClick={() => setShowApplicationForm(true)}
                  className="group btn btn--primary"
                >
                  Apply to Join
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
                <Link href="/get-started" className="btn btn--ghost">
                  Hire Talent Instead
                </Link>
              </div>

              <ul
                className="flex flex-wrap gap-x-6 gap-y-3"
                style={{ listStyle: 'none', padding: 0, margin: '2.5rem 0 0' }}
              >
                {['Portfolio-reviewed talent', 'Backed by the FreakingMinds agency', '48-hour application review'].map((item) => (
                  <li key={item} className="flex items-center gap-2 font-site-sans text-site-label text-site-muted">
                    <Check className="w-4 h-4 text-site-accent" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-center lg:justify-end">
              <BrainMark pose="celebrating" width={380} style={{ ['--brain-tilt' as string]: '5deg' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section className="sec">
        <div className="wrap">
          {/* `lay-rail`: the heading sits beside the steps instead of on top
              of a 768px block with half the row empty to its right. */}
          <div className="lay-rail">
            <div>
              <div className="eyebrow">
                <span className="tag">Your journey</span>
              </div>
              <h2 className="d" style={{ fontSize: 'clamp(1.9rem, 3.6vw, 3.2rem)', marginTop: 18 }}>
                From application to <span className="text-site-accent">earning.</span>
              </h2>
            </div>

            <div>
              <p className="lede lay-measure" style={{ marginBottom: 'clamp(28px, 3vw, 44px)' }}>
                No endless interviews. No algorithm games. Three steps and you&apos;re in.
              </p>

              {/*
                One responsive block. This was two: a `hidden md:block` desktop
                version with dashed circles and hand-drawn SVG connectors, and
                an `md:hidden` mobile version — 129 lines rendering the same
                three items from the same array. The dashed-circle treatment
                was V2's decorative language; the site's language is numbered
                rows.
              */}
              <ul className="cap" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {processSteps.map((item) => (
                  <li key={item.step} className="cap-row" style={{ gridTemplateColumns: '54px 1fr' }}>
                    <span className="tag n">{item.step}</span>
                    <span>
                      <span className="cap-name">{item.title}</span>
                      <span className="cap-desc" style={{ gridColumn: 'auto', marginTop: 10, display: 'block' }}>
                        {item.description}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Categories — Asymmetric 2-col with bento ──── */}
      <section ref={bentoSectionRef} className="sec overflow-hidden">
        {/* `wrap`, not `site-measure`. The two are identical rules under two
            names; keeping both meant a reader could not tell whether this
            section was deliberately different. */}
        <div className="wrap">
          <div className="lay-split">
            {/* Left: Copy */}
            <div className={`transition-[opacity,transform] duration-500 ease-out ${bentoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="eyebrow">
              <span className="tag">We Need You</span>
            </div>

              <h2 className="text-site-h2 font-site-display font-bold text-site-text mb-6 leading-[1.1]">
                Whatever you do,{' '}
                <span className="text-site-accent">we want you in.</span>
              </h2>

              <p className="lede lay-measure mb-10">
                Designers, developers, marketers, filmmakers, writers — if you&apos;re freaking great
                at what you do, there&apos;s a spot for you here.
              </p>

              <div className="flex flex-wrap gap-x-6 gap-y-3 mb-10">
                {['All Skill Levels Welcome', 'Global Talent Pool', 'Portfolio-Based Review'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-site-muted">
                    <Check className="w-4 h-4 text-site-accent" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <button
                  onClick={() => setShowApplicationForm(true)}
                  className="btn btn--primary"
                >
                  Apply Now
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Right: Bento grid */}
            <div
              className={`relative transition-[opacity,transform] duration-500 delay-100 ease-out ${bentoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              {/*
                One grid. This was two: a `lg:hidden` two-column version and a
                `hidden lg:grid` bento with named template areas, both mapping
                the same six categories. The bento's areas gave three tiles
                double width for decoration only — the categories are peers.
              */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {bentoCategories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <Link
                      key={cat.name}
                      href="#apply"
                      className="site-surface group flex flex-col justify-between p-4 transition-colors"
                      style={{ minHeight: 140 }}
                    >
                      <Icon className="w-5 h-5 text-site-accent" aria-hidden />
                      <span>
                        <span className="block font-site-sans text-site-body text-site-text">
                          {cat.name}
                        </span>
                        <span className="mt-1 block font-site-sans text-site-label uppercase text-site-muted">
                          {cat.description}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>

            </div>
          </div>

          {/* Plus four more.
              These chips were white on white: a hardcoded
              `rgba(255,255,255,0.12)` fill with a `hover:text-white` label,
              left over from the V2 dark theme. On the bone ground they were
              invisible, and hovering made them more so. Tokens now, so they
              work in both themes. */}
          <div
            className="flex flex-wrap items-center gap-3 mt-12"
            style={{ opacity: bentoVisible ? 1 : 0, transition: 'opacity 0.5s ease-out 0.4s' }}
          >
            <span className="tag mr-2">Plus</span>
            {moreCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link key={cat.name} href="/get-started" className="cm-chip">
                  <Icon className="w-4 h-4" aria-hidden />
                  {cat.name}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section 4: Why Businesses Choose Us — varied grid ─────── */}
      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">
              <span className="tag">Why join</span>
            </div>
            <h2 className="d" data-mask style={{ fontSize: 'clamp(1.9rem, 3.6vw, 3.2rem)', marginTop: 18 }}>
              This isn&apos;t another <span className="text-site-accent">freelance platform.</span>
            </h2>
          </div>

          {/* Featured 2 — larger horizontal cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
            {featuredBenefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="site-surface rounded-site-lg p-6 md:p-8 transition-[box-shadow,transform] duration-300 hover:-translate-y-1 relative overflow-hidden group"
                >

                  <div className="relative" style={{ zIndex: 2 }}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="cm-tile cm-tile--lg">
                        <Icon className="w-7 h-7" aria-hidden />
                      </div>
                      <p className="text-site-accent font-semibold text-sm tracking-wide uppercase">{benefit.tagline}</p>
                    </div>
                    <h3 className="font-site-display text-xl font-bold text-site-text mb-3">{benefit.title}</h3>
                    <p className="text-site-muted text-sm leading-relaxed">{benefit.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Regular 4 — smaller cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {regularBenefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="site-surface rounded-site-lg p-6 relative overflow-hidden group hover:scale-[1.03] transition-transform duration-300"
                >

                  <div className="relative" style={{ zIndex: 2 }}>
                    <div className="cm-tile mb-4">
                      <Icon className="w-6 h-6" aria-hidden />
                    </div>
                    <h3 className="font-site-display text-base font-bold text-site-text mb-2">{benefit.title}</h3>
                    <p className="text-site-muted text-xs leading-relaxed">{benefit.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Closing ─────────────────────────────────────────────────── */}
      {/*
        This was two sections, back to back, that said the same thing: a
        "Need to hire instead?" card with a "Hire Creative Talent" button,
        immediately followed by a split whose right half was "Looking to hire
        instead?" with a "Hire Talent" button. One of them was redundant on
        arrival.

        Both were also whole sections wrapped in a card, so their content sat
        32px further inset than every other section on the page — two of the
        ten left edges this page had.
      */}
      <section id="for-creatives" className="sec">
        <div className="wrap">
          <div className="lay-split">
            <div>
              <div className="eyebrow">
                <span className="tag tag--a">For creatives</span>
              </div>
              <h2 className="d" style={{ fontSize: 'clamp(1.9rem, 3.6vw, 3.2rem)', maxWidth: '14ch' }}>
                Ready to do some <span className="text-site-accent">freaking great</span> work?
              </h2>
              <p className="lede lay-measure" style={{ marginTop: 'clamp(20px, 2.4vw, 30px)' }}>
                Apply in minutes. Get reviewed in 48 hours. Start working with real brands.
              </p>
              <div className="mt-10">
                <button
                  onClick={() => setShowApplicationForm(true)}
                  className="group btn btn--primary"
                >
                  Apply to Join
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            <div>
              <div className="eyebrow">
                <span className="tag">For businesses</span>
              </div>
              <h3 className="font-site-display text-site-h3 text-site-text" style={{ marginTop: 18 }}>
                Hiring instead?
              </h3>
              <p className="mt-4 font-site-sans text-site-body text-site-muted">
                Tell us what you need and we will match you with portfolio-reviewed creatives
                from the network. No sourcing, no bidding wars.
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '1.75rem 0 0' }}>
                {talentPerks.map((perk) => {
                  const Icon = perk.icon;
                  return (
                    <li
                      key={perk.title}
                      className="flex items-center gap-3 py-3"
                      style={{ borderTop: '1px solid var(--site-line-soft)' }}
                    >
                      <Icon className="w-4 h-4 text-site-accent shrink-0" aria-hidden />
                      <span className="font-site-sans text-site-body text-site-text">
                        {perk.title}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-8">
                <Link href="/get-started" className="link-u">
                  Hire creative talent <span aria-hidden>&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
      <SiteFooter />
    </SiteShell>
  );
}
