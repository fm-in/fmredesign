'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { TalentApplication } from '@/lib/admin/talent-types';
import { TalentApplicationForm } from '@/components/public/TalentApplicationForm';
import { V2PageWrapper } from "@/components/layouts/V2PageWrapper";

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
    gradient: 'v2-gradient-brand', area: 'design', wash: '201, 50, 93',
  },
  {
    icon: Code, name: 'Development', description: 'Web & app development',
    gradient: 'v2-gradient-deep', area: 'dev', wash: '120, 50, 140',
  },
  {
    icon: Video, name: 'Video Production', description: 'Motion graphics & reels',
    gradient: 'v2-gradient-content', area: 'video', wash: '255, 150, 100',
  },
  {
    icon: PenTool, name: 'Content Creation', description: 'Blogs, scripts & strategy',
    gradient: 'v2-gradient-seo', area: 'content', wash: '255, 127, 80',
  },
  {
    icon: Megaphone, name: 'Digital Marketing', description: 'SEO, PPC & campaigns',
    gradient: 'v2-gradient-performance', area: 'marketing', wash: '168, 37, 72',
  },
  {
    icon: Users, name: 'Influencer & Social', description: 'Creators & community',
    gradient: 'v2-gradient-social', area: 'influencer', wash: '224, 77, 125',
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
    gradient: 'v2-gradient-brand', wash: '201, 50, 93', featured: true,
  },
  {
    icon: ShieldCheck, title: 'No Bidding Wars', tagline: 'Your work speaks for itself.',
    description: 'We match you to projects based on your skills, not who bids lowest. Your portfolio is your pitch.',
    gradient: 'v2-gradient-performance', wash: '168, 37, 72', featured: true,
  },
  {
    icon: Users, title: 'Agency Team Behind You',
    description: 'You\'re not alone. Project managers, creative directors, and a full agency backing your work.',
    gradient: 'v2-gradient-social', wash: '224, 77, 125', featured: false,
  },
  {
    icon: Globe, title: 'Your Own Profile Page',
    description: 'Get a public talent profile that showcases your work to clients worldwide.',
    gradient: 'v2-gradient-content', wash: '255, 150, 100', featured: false,
  },
  {
    icon: Zap, title: 'Fast Onboarding',
    description: 'Apply today, get reviewed in 48 hours, start working on projects right away.',
    gradient: 'v2-gradient-seo', wash: '140, 29, 74', featured: false,
  },
  {
    icon: TrendingUp, title: 'Grow With Us',
    description: 'As you deliver great work, you get access to bigger projects and better clients.',
    gradient: 'v2-gradient-deep', wash: '100, 30, 90', featured: false,
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
      <V2PageWrapper>
        <section className="relative z-10 v2-section pt-40 pb-32">
          <div className="v2-container">
            {/* Page Header */}
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <div className="v2-badge v2-badge-glass" style={{ marginBottom: '24px' }}>
                <Sparkles className="w-4 h-4 v2-text-primary" />
                <span className="v2-text-primary">Join CreativeMinds</span>
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-5xl font-bold v2-text-primary leading-tight" style={{ marginBottom: '16px' }}>
                Apply to the <span className="v2-accent">Network</span>
              </h1>
              <p className="text-base md:text-lg v2-text-secondary leading-relaxed max-w-2xl mx-auto">
                Four quick steps. Our team reviews every application within 48 hours.
              </p>
            </div>

            <TalentApplicationForm
              onSubmit={handleApplicationSubmit}
              onCancel={() => setShowApplicationForm(false)}
            />
          </div>
        </section>
      </V2PageWrapper>
    );
  }

  if (submitted) {
    return (
      <V2PageWrapper>
        <section className="relative z-10 min-h-screen flex items-center justify-center v2-section">
          <div className="v2-container">
            <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl p-6 sm:p-8 md:p-12 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-fm-neutral-900 mb-4">
                Application Submitted Successfully!
              </h1>
              <p className="text-lg text-fm-neutral-600 mb-8">
                Thank you for joining the CreativeMinds network. Our team will review your application
                and get back to you within 48 hours.
              </p>
              <div className="bg-fm-magenta-50 rounded-xl p-6 mb-8">
                <h3 className="text-lg font-semibold mb-4 text-fm-neutral-900">What happens next?</h3>
                <div className="space-y-3 text-left">
                  {[
                    { step: 1, text: "Application review (24-48 hours)" },
                    { step: 2, text: "Portfolio verification" },
                    { step: 3, text: "Welcome to the network & first project opportunities" }
                  ].map((item) => (
                    <div key={item.step} className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-fm-magenta-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-fm-magenta-600">{item.step}</span>
                      </div>
                      <span className="text-sm text-fm-neutral-700">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/" className="v2-btn v2-btn-magenta">
                Visit Freaking Minds
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </V2PageWrapper>
    );
  }

  const featuredBenefits = creativeBenefits.filter(b => b.featured);
  const regularBenefits = creativeBenefits.filter(b => !b.featured);

  return (
    <V2PageWrapper>
      {/* ── Section 1: Hero — Asymmetric 2-col ──────────────────────── */}
      <section className="relative z-10 v2-section pt-40">
        <div className="v2-container v2-container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">

            {/* Left: Copy (7 cols) */}
            <div className="lg:col-span-7 flex flex-col items-start">
              <div className="v2-badge v2-badge-glass mb-8">
                <Sparkles className="w-4 h-4 v2-text-primary" />
                <span className="v2-text-primary">CreativeMinds by FreakingMinds</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold v2-text-primary leading-[1.08] tracking-tight" style={{ marginBottom: '28px' }}>
                Stop chasing gigs.{' '}
                <span className="v2-accent">Start creating.</span>
              </h1>

              <p className="v2-text-secondary text-lg md:text-xl leading-relaxed max-w-full lg:max-w-lg" style={{ marginBottom: '40px' }}>
                Real clients. Real budgets. No bidding wars.
                Join a freaking good network of creatives backed by an actual agency.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-4 w-full sm:w-auto" style={{ marginBottom: '40px' }}>
                <button
                  onClick={() => setShowApplicationForm(true)}
                  className="group v2-btn v2-btn-primary v2-btn-lg"
                >
                  Apply to Join
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
                <Link href="/get-started" className="v2-btn v2-btn-secondary v2-btn-lg">
                  Hire Talent Instead
                </Link>
              </div>

              {/* Inline proof points */}
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {['Portfolio-Reviewed Talent', 'Backed by FreakingMinds Agency', '48hr Application Review'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm v2-text-secondary">
                    <Check className="w-4 h-4 text-fm-magenta-600" />
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
                    background: 'radial-gradient(circle at 50% 50%, rgba(201, 50, 93, 0.2) 0%, transparent 65%)',
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
                    filter: 'drop-shadow(0 30px 60px rgba(140,25,60,0.3))',
                    animation: 'v2HeroFloat 6s ease-in-out infinite',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: How It Works — dashed circle process ──────────── */}
      <section className="relative z-10 v2-section v2-texture-mesh">
        <div className="v2-container">
          <div className="max-w-3xl mx-auto" style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div className="v2-badge v2-badge-glass mb-6">
              <Target className="w-4 h-4 v2-text-primary" />
              <span className="v2-text-primary">Your Journey</span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold v2-text-primary mb-8 leading-tight">
              From application to <span className="v2-accent">earning.</span>
            </h2>
            <p className="text-lg v2-text-secondary leading-relaxed max-w-2xl mx-auto">
              No endless interviews. No algorithm games. Three steps and you&apos;re in.
            </p>
          </div>

          {/* Desktop: horizontal with dashed circles and curved connectors */}
          <div className="hidden md:block max-w-4xl mx-auto">
            <div className="relative">
              {/* Curved dashed connector 1→2 */}
              <svg
                className="absolute pointer-events-none"
                style={{ top: '56px', left: '23%', width: '20%', height: '40px', zIndex: 1 }}
                viewBox="0 0 200 40"
                fill="none"
                preserveAspectRatio="xMidYMid meet"
              >
                <path
                  d="M 0 20 C 50 40, 150 0, 200 20"
                  stroke="rgba(201, 50, 93, 0.35)"
                  strokeWidth="2"
                  strokeDasharray="8 6"
                  fill="none"
                />
              </svg>
              {/* Curved dashed connector 2→3 */}
              <svg
                className="absolute pointer-events-none"
                style={{ top: '56px', right: '23%', width: '20%', height: '40px', zIndex: 1 }}
                viewBox="0 0 200 40"
                fill="none"
                preserveAspectRatio="xMidYMid meet"
              >
                <path
                  d="M 0 20 C 50 40, 150 0, 200 20"
                  stroke="rgba(201, 50, 93, 0.35)"
                  strokeWidth="2"
                  strokeDasharray="8 6"
                  fill="none"
                />
              </svg>

              <div className="grid grid-cols-3 gap-8" style={{ position: 'relative', zIndex: 2 }}>
                {processSteps.map((item, index) => {
                  const icons = [PenTool, ShieldCheck, Zap];
                  const StepIcon = icons[index];
                  return (
                    <div key={item.step} style={{ textAlign: 'center' }}>
                      <div className="relative inline-block mb-8">
                        {/* Step number badge */}
                        <div
                          className="absolute w-8 h-8 rounded-full v2-gradient-brand flex items-center justify-center text-white text-sm font-bold shadow-lg"
                          style={{ top: '-4px', left: '-4px', zIndex: 3 }}
                        >
                          {index + 1}
                        </div>
                        {/* Dashed outer circle */}
                        <div
                          className="w-28 h-28 lg:w-32 lg:h-32 rounded-full flex items-center justify-center"
                          style={{
                            border: '2px dashed rgba(201, 50, 93, 0.3)',
                            background: 'rgba(255, 255, 255, 0.03)',
                          }}
                        >
                          {/* Inner icon circle */}
                          <div
                            className="w-14 h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center"
                            style={{
                              background: 'linear-gradient(135deg, rgba(201, 50, 93, 0.15), rgba(74, 25, 66, 0.12))',
                            }}
                          >
                            <StepIcon className="w-7 h-7 text-fm-magenta-600" />
                          </div>
                        </div>
                      </div>
                      <h3 className="font-display text-xl font-bold v2-text-primary mb-3">{item.title}</h3>
                      <p className="v2-text-secondary text-sm leading-relaxed max-w-[240px] mx-auto">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile: vertical with dashed circles */}
          <div className="md:hidden flex flex-col items-center">
            {processSteps.map((item, index) => {
              const icons = [PenTool, ShieldCheck, Zap];
              const StepIcon = icons[index];
              return (
                <div key={item.step} className="flex flex-col items-center" style={{ textAlign: 'center' }}>
                  <div className="relative inline-block mb-5">
                    {/* Step number badge */}
                    <div
                      className="absolute w-7 h-7 rounded-full v2-gradient-brand flex items-center justify-center text-white text-xs font-bold shadow-lg"
                      style={{ top: '-2px', left: '-2px', zIndex: 3 }}
                    >
                      {index + 1}
                    </div>
                    {/* Dashed circle */}
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center"
                      style={{
                        border: '2px dashed rgba(201, 50, 93, 0.3)',
                        background: 'rgba(255, 255, 255, 0.03)',
                      }}
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, rgba(201, 50, 93, 0.15), rgba(74, 25, 66, 0.12))',
                        }}
                      >
                        <StepIcon className="w-6 h-6 text-fm-magenta-600" />
                      </div>
                    </div>
                  </div>
                  <h3 className="font-display text-lg font-bold v2-text-primary mb-2">{item.title}</h3>
                  <p className="v2-text-secondary text-sm leading-relaxed max-w-[260px] mb-2">{item.description}</p>
                  {/* Vertical dashed connector */}
                  {index < processSteps.length - 1 && (
                    <div
                      className="my-4"
                      style={{
                        width: '2px',
                        height: '40px',
                        backgroundImage: 'linear-gradient(to bottom, rgba(201,50,93,0.3) 50%, transparent 50%)',
                        backgroundSize: '2px 8px',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Wave Divider */}
      <div className="relative" style={{ zIndex: 10, marginTop: '-1px' }}>
        <img src="/textures/wave-divider.svg" alt="" className="w-full" style={{ height: '60px', display: 'block', transform: 'scaleX(-1)' }} />
      </div>

      {/* ── Section 3: Categories — Asymmetric 2-col with bento ──── */}
      <section ref={bentoSectionRef} className="relative z-10 v2-section overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none" style={{ contain: 'layout style paint' }}>
          <div
            className="absolute -left-1/4 top-1/4 w-[500px] h-[500px] rounded-full opacity-25"
            style={{
              background: 'radial-gradient(circle, rgba(201, 50, 93, 0.12) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
          />
        </div>

        <div className="relative v2-container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div className={`transition-[opacity,transform] duration-500 ease-out ${bentoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="v2-badge v2-badge-glass mb-8">
                <Sparkles className="w-4 h-4 v2-text-primary" />
                <span className="v2-text-primary">We Need You</span>
              </div>

              <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold v2-text-primary mb-6 leading-[1.1]">
                Whatever you do,{' '}
                <span className="v2-accent">we want you in.</span>
              </h2>

              <p className="text-lg md:text-xl v2-text-secondary mb-10 leading-relaxed max-w-xl">
                Designers, developers, marketers, filmmakers, writers — if you&apos;re freaking great
                at what you do, there&apos;s a spot for you here.
              </p>

              <div className="flex flex-wrap gap-x-6 gap-y-3 mb-10">
                {['All Skill Levels Welcome', 'Global Talent Pool', 'Portfolio-Based Review'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm v2-text-secondary">
                    <Check className="w-4 h-4 text-fm-magenta-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <button
                  onClick={() => setShowApplicationForm(true)}
                  className="v2-btn v2-btn-primary"
                >
                  Apply Now
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Right: Bento grid */}
            <div className={`relative transition-[opacity,transform] duration-500 delay-100 ease-out ${bentoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {/* Mobile: 2-col flat grid */}
              <div className="grid grid-cols-2 gap-3 lg:hidden">
                {bentoCategories.map((cat, index) => {
                  const Icon = cat.icon;
                  return (
                    <Link
                      key={cat.name}
                      href="/get-started"
                      className="group relative rounded-2xl p-4 overflow-hidden transition-[opacity,transform] duration-300"
                      style={{
                        opacity: bentoVisible ? 1 : 0,
                        transform: bentoVisible ? 'translateY(0)' : 'translateY(10px)',
                        transitionDelay: `${index * 40 + 100}ms`,
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(245,243,248,0.92) 100%)',
                        border: '1px solid rgba(201, 50, 93, 0.08)',
                      }}
                    >
                      <div className={`absolute top-0 left-0 right-0 h-[3px] ${cat.gradient} opacity-70`} />
                      <div className={`w-10 h-10 rounded-xl ${cat.gradient} flex items-center justify-center shadow-lg mb-3`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-fm-neutral-900 font-semibold text-sm mb-0.5 line-clamp-1">{cat.name}</h3>
                      <p className="text-fm-neutral-500 text-xs line-clamp-2">{cat.description}</p>
                    </Link>
                  );
                })}
              </div>

              {/* Desktop: Bento grid with named areas */}
              <div
                className="hidden lg:grid gap-3"
                style={{
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gridTemplateRows: '140px 140px 140px',
                  gridTemplateAreas: `
                    "design design dev"
                    "video content dev"
                    "marketing marketing influencer"
                  `,
                }}
              >
                {bentoCategories.map((cat, index) => {
                  const Icon = cat.icon;
                  const isLarge = cat.area === 'design' || cat.area === 'marketing' || cat.area === 'dev';

                  return (
                    <Link
                      key={cat.name}
                      href="/get-started"
                      className="group relative rounded-2xl overflow-hidden transition-[opacity,transform] duration-300 hover:scale-[1.02]"
                      style={{
                        gridArea: cat.area,
                        opacity: bentoVisible ? 1 : 0,
                        transform: bentoVisible ? 'translateY(0)' : 'translateY(10px)',
                        transitionDelay: `${index * 50 + 100}ms`,
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(245,243,248,0.92) 100%)',
                        border: '1px solid rgba(201, 50, 93, 0.08)',
                      }}
                    >
                      {/* Top accent line */}
                      <div className={`absolute top-0 left-0 right-0 h-[3px] ${cat.gradient} opacity-70 group-hover:opacity-100 transition-opacity duration-500`} />

                      <div className="relative h-full p-5 flex flex-col justify-between">
                        <div className={`${isLarge ? 'w-12 h-12' : 'w-10 h-10'} rounded-xl ${cat.gradient} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                          <Icon className={`${isLarge ? 'w-6 h-6' : 'w-5 h-5'} text-white`} />
                        </div>

                        <div>
                          <h3 className={`text-fm-neutral-900 font-semibold ${isLarge ? 'text-base' : 'text-sm'} mb-0.5 group-hover:text-fm-magenta-700 transition-colors`}>
                            {cat.name}
                          </h3>
                          {isLarge && (
                            <p className="text-fm-neutral-500 text-xs leading-relaxed">{cat.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Hover arrow */}
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-300 translate-x-1 group-hover:translate-x-0">
                        <ArrowRight className="w-4 h-4 text-fm-neutral-400" />
                      </div>

                      {/* Hover shadow */}
                      <div
                        className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{ boxShadow: '0 8px 30px rgba(201, 50, 93, 0.12), 0 2px 8px rgba(0,0,0,0.06)' }}
                      />
                    </Link>
                  );
                })}
              </div>

              {/* Decorative circles */}
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none" style={{ border: '1px solid rgba(201, 50, 93, 0.08)' }} />
              <div className="absolute -bottom-5 -left-5 w-20 h-20 rounded-full pointer-events-none" style={{ border: '1px solid rgba(201, 50, 93, 0.08)' }} />
            </div>
          </div>

          {/* +4 more categories strip */}
          <div
            className="flex flex-wrap items-center justify-center gap-3 mt-12"
            style={{ opacity: bentoVisible ? 1 : 0, transition: 'opacity 0.5s ease-out 0.4s' }}
          >
            <span className="text-sm v2-text-tertiary mr-2">Plus:</span>
            {moreCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.name}
                  href="/get-started"
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium v2-text-secondary hover:text-white transition-colors duration-300"
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
      <section className="relative z-10 v2-section v2-texture-dots">
        <div className="v2-container">
          <div className="max-w-3xl mx-auto" style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div className="v2-badge v2-badge-glass mb-6">
              <Award className="w-4 h-4 v2-text-primary" />
              <span className="v2-text-primary">Why Join</span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold v2-text-primary mb-8 leading-tight">
              This isn&apos;t another{' '}
              <span className="v2-accent">freelance platform.</span>
            </h2>
          </div>

          {/* Featured 2 — larger horizontal cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
            {featuredBenefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="v2-paper rounded-2xl p-8 hover:shadow-2xl transition-[box-shadow,transform] duration-300 hover:-translate-y-1 relative overflow-hidden group"
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
                      <p className="text-fm-magenta-600 font-semibold text-sm tracking-wide uppercase">{benefit.tagline}</p>
                    </div>
                    <h3 className="font-display text-xl font-bold text-fm-neutral-900 mb-3">{benefit.title}</h3>
                    <p className="text-fm-neutral-600 text-sm leading-relaxed">{benefit.description}</p>
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
                  className="v2-paper rounded-2xl p-6 relative overflow-hidden group hover:scale-[1.03] transition-transform duration-300"
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
                    <h3 className="font-display text-base font-bold text-fm-neutral-900 mb-2">{benefit.title}</h3>
                    <p className="text-fm-neutral-600 text-xs leading-relaxed">{benefit.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section 5: For Creatives ────────────────────────────────── */}
      <section id="for-creatives" className="relative z-10 v2-section">
        <div className="v2-container v2-container-narrow">
          <div className="v2-paper rounded-3xl p-8 md:p-12" style={{ textAlign: 'center' }}>
            <div className="v2-badge v2-badge-light mb-6">
              <Briefcase className="w-4 h-4" />
              <span>For Businesses</span>
            </div>

            <h2 className="font-display text-3xl md:text-4xl font-bold text-fm-neutral-900 mb-4 leading-tight">
              Need to <span className="text-fm-magenta-600">hire</span> instead?
            </h2>

            <p className="text-fm-neutral-600 mb-8 max-w-lg mx-auto">
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
                    className="flex items-center gap-2 bg-fm-magenta-50 text-fm-magenta-700 px-4 py-2 rounded-full text-sm font-medium"
                  >
                    <Icon className="w-4 h-4" />
                    {perk.title}
                  </div>
                );
              })}
            </div>

            <Link
              href="/get-started"
              className="group v2-btn v2-btn-magenta"
            >
              Hire Creative Talent
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 6: Bottom CTA — Split Design ───────────────────── */}
      <section className="relative z-10 v2-section pb-32">
        <div className="v2-container v2-container-narrow">
          <div className="v2-paper rounded-3xl p-8 md:p-12 lg:p-14 relative overflow-hidden">
            {/* Ambient smoke blobs */}
            <div
              className="absolute pointer-events-none rounded-full"
              style={{
                width: '350px', height: '350px', top: '-100px', right: '-80px',
                background: 'radial-gradient(circle, rgba(201,50,93,0.06) 0%, transparent 70%)',
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
              <div className="md:pr-8 lg:pr-12" style={{ textAlign: 'center' }}>
                <h3 className="font-display text-2xl md:text-3xl font-bold text-fm-neutral-900 mb-4 leading-tight">
                  Ready to do some{' '}
                  <span className="text-fm-magenta-600">freaking great</span> work?
                </h3>
                <p className="text-fm-neutral-600 mb-6">
                  Apply in minutes. Get reviewed in 48 hours. Start working with real brands.
                </p>
                <button
                  onClick={() => setShowApplicationForm(true)}
                  className="group v2-btn v2-btn-magenta"
                >
                  Apply to Join
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Divider */}
              <div
                className="hidden md:block absolute left-1/2 top-6 bottom-6 w-px pointer-events-none"
                style={{
                  background: 'linear-gradient(180deg, transparent, rgba(201,50,93,0.15), transparent)',
                  transform: 'translateX(-50%)',
                }}
              />
              <div className="md:hidden w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,50,93,0.15), transparent)' }} />

              {/* Right — Businesses (Secondary) */}
              <div className="md:pl-8 lg:pl-12" style={{ textAlign: 'center' }}>
                <h3 className="font-display text-2xl md:text-3xl font-bold text-fm-neutral-900 mb-4 leading-tight">
                  Looking to{' '}
                  <span className="text-fm-magenta-600">hire</span> instead?
                </h3>
                <p className="text-fm-neutral-600 mb-6">
                  Tell us what you need — we&apos;ll match you with the right creative from our network.
                </p>
                <Link href="/get-started" className="group v2-btn v2-btn-outline">
                  Hire Talent
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </V2PageWrapper>
  );
}
