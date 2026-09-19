'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { TalentApplication } from '@/lib/admin/talent-types';
import { TalentApplicationForm } from '@/components/public/TalentApplicationForm';
import { SiteShell } from '@/components/site/SiteShell';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';

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
  Award,
  Target,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Globe,
  Check,
} from 'lucide-react';

/* ─── Data ───────────────────────────────────────────────────────── */

const bentoCategories = [
  {
    icon: Palette, name: 'Creative Design', description: 'Visual identity & branding',
    gradient: 'bg-site-raised', area: 'design', wash: '201, 50, 93',
  },
  {
    icon: Code, name: 'Development', description: 'Web & app development',
    gradient: 'bg-site-raised', area: 'dev', wash: '120, 50, 140',
  },
  {
    icon: Video, name: 'Video Production', description: 'Motion graphics & reels',
    gradient: 'bg-site-raised', area: 'video', wash: '255, 150, 100',
  },
  {
    icon: PenTool, name: 'Content Creation', description: 'Blogs, scripts & strategy',
    gradient: 'bg-site-raised', area: 'content', wash: '255, 127, 80',
  },
  {
    icon: Megaphone, name: 'Digital Marketing', description: 'SEO, PPC & campaigns',
    gradient: 'bg-site-raised', area: 'marketing', wash: '168, 37, 72',
  },
  {
    icon: Users, name: 'Influencer & Social', description: 'Creators & community',
    gradient: 'bg-site-raised', area: 'influencer', wash: '224, 77, 125',
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
    description: 'Work with actual businesses who have real budgets — not someone offering "exposure" as payment.',
    gradient: 'bg-site-raised', wash: '201, 50, 93', featured: true,
  },
  {
    icon: ShieldCheck, title: 'No Bidding Wars', tagline: 'Your work speaks for itself.',
    description: 'We match you to projects based on your skills, not who bids lowest. Your portfolio is your pitch.',
    gradient: 'bg-site-raised', wash: '168, 37, 72', featured: true,
  },
  {
    icon: Users, title: 'Agency Team Behind You',
    description: 'You\'re not alone. Project managers, creative directors, and a full agency backing your work.',
    gradient: 'bg-site-raised', wash: '224, 77, 125', featured: false,
  },
  {
    icon: Globe, title: 'Your Own Profile Page',
    description: 'Get a public talent profile that showcases your work to clients worldwide.',
    gradient: 'bg-site-raised', wash: '255, 150, 100', featured: false,
  },
  {
    icon: Zap, title: 'Fast Onboarding',
    description: 'Apply today, get reviewed in 48 hours, start working on projects right away.',
    gradient: 'bg-site-raised', wash: '140, 29, 74', featured: false,
  },
  {
    icon: TrendingUp, title: 'Grow With Us',
    description: 'As you deliver great work, you get access to bigger projects and better clients.',
    gradient: 'bg-site-raised', wash: '100, 30, 90', featured: false,
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

  const handleApplicationSubmit = async (application: TalentApplication) => {
    const response = await fetch('/api/talent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit_application', application })
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
        <section className="relative z-10 py-site-section">
          <div className="site-measure">
            {/* Page Header */}
            <div style={{ marginBottom: '48px' }}>
              <div className="site-chip" style={{ marginBottom: '24px' }}>
                <Sparkles className="w-4 h-4 text-site-text" />
                <span className="text-site-text">Join CreativeMinds</span>
              </div>
              <h1 className="text-site-h2 font-site-display font-bold text-site-text leading-tight" style={{ marginBottom: '16px' }}>
                Apply to the <span className="text-site-accent">Network</span>
              </h1>
              <p className="text-base md:text-lg text-site-muted leading-relaxed max-w-2xl mx-auto">
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
        <section className="relative z-10 min-h-screen flex items-center justify-center py-site-section">
          <div className="site-measure">
            <div className="max-w-2xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 md:p-12 text-center">
              <div className="w-20 h-20 bg-site-raised rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle className="w-12 h-12 text-site-text" />
              </div>
              <h1 className="text-site-h3 font-bold text-site-text mb-4">
                Application Submitted Successfully!
              </h1>
              <p className="text-lg text-site-muted mb-8">
                Thank you for joining the CreativeMinds network. Our team will review your application
                and get back to you within 48 hours.
              </p>
              <div className="bg-site-raised rounded-xl p-6 mb-8">
                <h3 className="text-lg font-semibold mb-4 text-site-text">What happens next?</h3>
                <div className="space-y-3 text-left">
                  {[
                    { step: 1, text: "Application review (24-48 hours)" },
                    { step: 2, text: "Portfolio verification" },
                    { step: 3, text: "Welcome to the network & first project opportunities" }
                  ].map((item) => (
                    <div key={item.step} className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-site-raised rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-site-accent">{item.step}</span>
                      </div>
                      <span className="text-sm text-site-text">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/" className="site-button">
                Visit Freaking Minds
                <ArrowRight className="w-4 h-4" />
              </Link>
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
      {/* ── Section 1: Hero — Asymmetric 2-col ──────────────────────── */}
      <section className="relative z-10 py-site-section">
        <div className="site-measure site-measure">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">

            {/* Left: Copy (7 cols) */}
            <div className="lg:col-span-7 flex flex-col items-start">
              <div className="site-chip mb-8">
                <Sparkles className="w-4 h-4 text-site-text" />
                <span className="text-site-text">CreativeMinds by FreakingMinds</span>
              </div>

              <h1 className="text-site-display font-site-display font-bold text-site-text leading-[1.08] tracking-tight" style={{ marginBottom: '28px' }}>
                Stop chasing gigs.{' '}
                <span className="text-site-accent">Start creating.</span>
              </h1>

              <p className="text-site-muted text-lg md:text-xl leading-relaxed max-w-full lg:max-w-lg" style={{ marginBottom: '40px' }}>
                Real clients. Real budgets. No bidding wars.
                Join a freaking good network of creatives backed by an actual agency.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-4 w-full sm:w-auto" style={{ marginBottom: '40px' }}>
                <button
                  onClick={() => setShowApplicationForm(true)}
                  className="group site-button"
                >
                  Apply to Join
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
                <Link href="/get-started" className="site-button site-button--quiet">
                  Hire Talent Instead
                </Link>
              </div>

              {/* Inline proof points */}
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {['Portfolio-Reviewed Talent', 'Backed by FreakingMinds Agency', '48hr Application Review'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-site-muted">
                    <Check className="w-4 h-4 text-site-accent" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Brain Mascot (5 cols) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end relative">
              <div className="relative">
                {/* Glow behind mascot */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--site-accent) 0.200%, transparent) 0%, transparent 65%)',
                    transform: 'scale(1.5)',
                    filter: 'blur(25px)',
                    zIndex: -1,
                  }}
                />
                <img
                  src="/3dasset/brain-celebrating.webp"
                  alt="CreativeMinds Network"
                  loading="lazy"
                  className="max-w-full"
                  style={{
                    width: 'min(380px, 70vw)',
                    height: 'auto',
                    filter: 'drop-shadow(0 30px 60px color-mix(in srgb, var(--site-accent) 0.300%, transparent))',
                    animation: 'v2HeroFloat 6s ease-in-out infinite',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: How It Works — dashed circle process ──────────── */}
      <section className="relative z-10 py-site-section">
        <div className="site-measure">
          <div className="max-w-3xl" style={{ marginBottom: '64px' }}>
            <div className="site-chip mb-6">
              <Target className="w-4 h-4 text-site-text" />
              <span className="text-site-text">Your Journey</span>
            </div>
            <h2 className="text-site-h2 font-site-display font-bold text-site-text mb-8 leading-tight">
              From application to <span className="text-site-accent">earning.</span>
            </h2>
            <p className="text-lg text-site-muted leading-relaxed max-w-2xl mx-auto">
              No endless interviews. No algorithm games. Three steps and you&apos;re in.
            </p>
          </div>

          {/*
            One responsive block. This was two: a `hidden md:block` desktop
            version with dashed circles and hand-drawn SVG connectors, and an
            `md:hidden` mobile version — 129 lines rendering the same three
            items from the same array. The dashed-circle treatment was V2's
            decorative language; the site's language is numbered rows.
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
      </section>

      {/* Wave Divider */}
      <div className="relative" style={{ zIndex: 10, marginTop: '-1px' }}>
        <img src="/textures/wave-divider.svg" alt="" className="w-full" style={{ height: '60px', display: 'block', transform: 'scaleX(-1)' }} />
      </div>

      {/* ── Section 3: Categories — Asymmetric 2-col with bento ──── */}
      <section ref={bentoSectionRef} className="relative z-10 py-site-section overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none" style={{ contain: 'layout style paint' }}>
          <div
            className="absolute -left-1/4 top-1/4 w-[500px] h-[500px] rounded-full opacity-25"
            style={{
              background: 'radial-gradient(circle, color-mix(in srgb, var(--site-accent) 0.1200%, transparent) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
          />
        </div>

        <div className="relative site-measure">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div className={`transition-[opacity,transform] duration-500 ease-out ${bentoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="site-chip mb-8">
                <Sparkles className="w-4 h-4 text-site-text" />
                <span className="text-site-text">We Need You</span>
              </div>

              <h2 className="text-site-h2 font-site-display font-bold text-site-text mb-6 leading-[1.1]">
                Whatever you do,{' '}
                <span className="text-site-accent">we want you in.</span>
              </h2>

              <p className="text-lg md:text-xl text-site-muted mb-10 leading-relaxed max-w-xl">
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
                  className="site-button"
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

              {/* Decorative circles */}
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none" style={{ border: '1px solid color-mix(in srgb, var(--site-accent) 0.0800%, transparent)' }} />
              <div className="absolute -bottom-5 -left-5 w-20 h-20 rounded-full pointer-events-none" style={{ border: '1px solid color-mix(in srgb, var(--site-accent) 0.0800%, transparent)' }} />
            </div>
          </div>

          {/* +4 more categories strip */}
          <div
            className="flex flex-wrap items-center justify-center gap-3 mt-12"
            style={{ opacity: bentoVisible ? 1 : 0, transition: 'opacity 0.5s ease-out 0.4s' }}
          >
            <span className="text-sm text-site-muted mr-2">Plus:</span>
            {moreCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.name}
                  href="/get-started"
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-site-muted hover:text-white transition-colors duration-300"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {cat.name}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Wave Divider */}
      <div className="relative" style={{ zIndex: 10, marginTop: '-1px' }}>
        <img src="/textures/wave-divider.svg" alt="" className="w-full" style={{ height: '60px', display: 'block' }} />
      </div>

      {/* ── Section 4: Why Businesses Choose Us — varied grid ─────── */}
      <section className="relative z-10 py-site-section">
        <div className="site-measure">
          <div className="max-w-3xl" style={{ marginBottom: '64px' }}>
            <div className="site-chip mb-6">
              <Award className="w-4 h-4 text-site-text" />
              <span className="text-site-text">Why Join</span>
            </div>
            <h2 className="text-site-h2 font-site-display font-bold text-site-text mb-8 leading-tight">
              This isn&apos;t another{' '}
              <span className="text-site-accent">freelance platform.</span>
            </h2>
          </div>

          {/* Featured 2 — larger horizontal cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
            {featuredBenefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="site-surface rounded-2xl p-8 hover:shadow-2xl transition-[box-shadow,transform] duration-300 hover:-translate-y-1 relative overflow-hidden group"
                >
                  {/* Corner glow */}
                  <div
                    className="absolute -top-10 -right-10 w-44 h-44 rounded-full pointer-events-none transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background: `radial-gradient(circle, rgba(${benefit.wash}, 0.07) 0%, rgba(${benefit.wash}, 0.02) 40%, transparent 70%)`,
                      opacity: 0.7,
                    }}
                  />
                  {/* Watermark icon */}
                  <div
                    className="absolute -bottom-2 -right-2 pointer-events-none transition-opacity duration-500 group-hover:opacity-[0.12]"
                    style={{ opacity: 0.08 }}
                  >
                    <Icon className="w-32 h-32" style={{ color: `rgb(${benefit.wash})` }} />
                  </div>

                  <div className="relative" style={{ zIndex: 2 }}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-14 h-14 ${benefit.gradient} rounded-xl flex items-center justify-center`}>
                        <Icon className="w-7 h-7 text-white" />
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
                  className="site-surface rounded-2xl p-6 relative overflow-hidden group hover:scale-[1.03] transition-transform duration-300"
                >
                  {/* Corner glow */}
                  <div
                    className="absolute -top-10 -right-10 w-36 h-36 rounded-full pointer-events-none transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background: `radial-gradient(circle, rgba(${benefit.wash}, 0.07) 0%, rgba(${benefit.wash}, 0.02) 40%, transparent 70%)`,
                      opacity: 0.7,
                    }}
                  />

                  <div className="relative" style={{ zIndex: 2 }}>
                    <div className={`w-12 h-12 ${benefit.gradient} rounded-xl flex items-center justify-center mb-4`}>
                      <Icon className="w-6 h-6 text-white" />
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

      {/* ── Section 5: For Creatives ────────────────────────────────── */}
      <section id="for-creatives" className="relative z-10 py-site-section">
        <div className="site-measure site-measure site-measure--narrow">
          <div className="site-surface rounded-3xl p-8 md:p-12">
            <div className="site-chip site-chip mb-6">
              <Briefcase className="w-4 h-4" />
              <span>For Businesses</span>
            </div>

            <h2 className="text-site-h3 font-site-display font-bold text-site-text mb-4 leading-tight">
              Need to <span className="text-site-accent">hire</span> instead?
            </h2>

            <p className="text-site-muted mb-8 max-w-lg mx-auto">
              Tell us what you need — we&apos;ll match you with portfolio-reviewed creatives
              from our network. No endless sourcing, no bidding wars.
            </p>

            {/* Perk badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              {talentPerks.map((perk) => {
                const Icon = perk.icon;
                return (
                  <div
                    key={perk.title}
                    className="flex items-center gap-2 bg-site-raised text-site-accent px-4 py-2 rounded-full text-sm font-medium"
                  >
                    <Icon className="w-4 h-4" />
                    {perk.title}
                  </div>
                );
              })}
            </div>

            <Link
              href="/get-started"
              className="group site-button"
            >
              Hire Creative Talent
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 6: Bottom CTA — Split Design ───────────────────── */}
      <section className="relative z-10 py-site-section">
        <div className="site-measure site-measure site-measure--narrow">
          <div className="site-surface rounded-3xl p-8 md:p-12 lg:p-14 relative overflow-hidden">
            {/* Ambient smoke blobs */}
            <div
              className="absolute pointer-events-none rounded-full"
              style={{
                width: '350px', height: '350px', top: '-100px', right: '-80px',
                background: 'radial-gradient(circle, color-mix(in srgb, var(--site-accent) 0.0600%, transparent) 0%, transparent 70%)',
                animation: 'ctaSmokeFloat1 8s ease-in-out infinite',
              }}
            />
            <div
              className="absolute pointer-events-none rounded-full"
              style={{
                width: '300px', height: '300px', bottom: '-80px', left: '-60px',
                background: 'radial-gradient(circle, rgba(160,30,70,0.05) 0%, transparent 70%)',
                animation: 'ctaSmokeFloat2 10s ease-in-out infinite',
              }}
            />

            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-0" style={{ zIndex: 2 }}>
              {/* Left — Creatives (Primary) */}
              <div className="md:pr-8 lg:pr-12">
                <h3 className="text-site-h3 font-site-display font-bold text-site-text mb-4 leading-tight">
                  Ready to do some{' '}
                  <span className="text-site-accent">freaking great</span> work?
                </h3>
                <p className="text-site-muted mb-6">
                  Apply in minutes. Get reviewed in 48 hours. Start working with real brands.
                </p>
                <button
                  onClick={() => setShowApplicationForm(true)}
                  className="group site-button"
                >
                  Apply to Join
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Divider */}
              <div
                className="hidden md:block absolute left-1/2 top-6 bottom-6 w-px pointer-events-none"
                style={{
                  background: 'linear-gradient(180deg, transparent, color-mix(in srgb, var(--site-accent) 0.1500%, transparent), transparent)',
                  transform: 'translateX(-50%)',
                }}
              />
              <div className="md:hidden w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--site-accent) 0.1500%, transparent), transparent)' }} />

              {/* Right — Businesses (Secondary) */}
              <div className="md:pl-8 lg:pl-12">
                <h3 className="text-site-h3 font-site-display font-bold text-site-text mb-4 leading-tight">
                  Looking to{' '}
                  <span className="text-site-accent">hire</span> instead?
                </h3>
                <p className="text-site-muted mb-6">
                  Tell us what you need — we&apos;ll match you with the right creative from our network.
                </p>
                <Link href="/get-started" className="group site-button site-button--quiet">
                  Hire Talent
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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
