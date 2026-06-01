'use client';

import { useState } from "react";
import { ArrowRight, Search, Megaphone, Palette, BarChart3, Globe, Video, Zap, Target, Award, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { V2PageWrapper } from "@/components/layouts/V2PageWrapper";
import { ServiceDeepDiveModal } from "@/components/services/ServiceDeepDiveModal";

const services = [
  {
    icon: Search,
    id: "seo",
    title: "Search Engine Optimization (SEO)",
    tagline: "Get found. Get chosen.",
    description: "Dominate search results with our data-driven SEO strategies. We optimize your website for visibility, traffic, and conversions.",
    features: ["Keyword Research & Strategy", "On-page & Technical SEO", "Link Building & Content Marketing", "Local SEO Optimization", "SEO Audits & Reporting"],
    results: "Proven strategies to boost organic traffic and search visibility",
    colorClass: "v2-gradient-seo"
  },
  {
    icon: Megaphone,
    id: "social",
    title: "Social Media Marketing",
    tagline: "Stop posting. Start connecting.",
    description: "Build engaged communities and drive brand awareness across all major social platforms with strategic content and campaigns.",
    features: ["Social Media Strategy", "Content Creation & Curation", "Community Management", "Paid Social Advertising", "Influencer Partnerships"],
    results: "Build engaged communities that drive brand awareness",
    colorClass: "v2-gradient-social"
  },
  {
    icon: BarChart3,
    id: "performance",
    altIds: ["performance-marketing"],
    title: "Pay-Per-Click (PPC) Advertising",
    tagline: "Every rupee. Maximum impact.",
    description: "Maximize your ROI with targeted PPC campaigns across Google Ads, Facebook, and other platforms.",
    features: ["Google Ads Management", "Facebook & Instagram Ads", "Shopping Campaigns", "Remarketing Strategies", "Conversion Optimization"],
    results: "Data-driven campaigns that maximize your ad spend ROI",
    colorClass: "v2-gradient-performance"
  },
  {
    icon: Palette,
    id: "branding",
    altIds: ["brand-strategy"],
    title: "Creative Design & Branding",
    tagline: "Look unforgettable.",
    description: "Create compelling visual identities and marketing materials that resonate with your target audience.",
    features: ["Brand Identity Design", "Logo & Visual Guidelines", "Marketing Collateral", "Packaging Design", "Brand Strategy Consulting"],
    results: "Build memorable brand identities that stand out",
    colorClass: "v2-gradient-brand"
  },
  {
    icon: Globe,
    id: "web",
    altIds: ["digital-experience"],
    title: "Website Design & Development",
    tagline: "Fast. Beautiful. Converting.",
    description: "Build fast, responsive, and conversion-optimized websites that serve as powerful marketing tools.",
    features: ["Responsive Web Design", "E-commerce Development", "Landing Page Optimization", "CMS Integration", "Performance Optimization"],
    results: "Fast, responsive sites that convert visitors into customers",
    colorClass: "v2-gradient-web"
  },
  {
    icon: Video,
    id: "content",
    altIds: ["creative-content"],
    title: "Content Marketing & Video Production",
    tagline: "Stories that sell.",
    description: "Engage your audience with high-quality content that tells your brand story and drives action.",
    features: ["Content Strategy", "Blog Writing & SEO Content", "Video Production", "Graphic Design", "Email Marketing"],
    results: "Content that drives engagement and generates quality leads",
    colorClass: "v2-gradient-content"
  }
];

const process = [
  { step: "01", title: "Discovery & Audit", description: "We analyze your current digital presence, understand your goals, and identify opportunities for growth." },
  { step: "02", title: "Strategy Development", description: "Our team creates a comprehensive digital marketing strategy tailored to your business objectives and target audience." },
  { step: "03", title: "Implementation", description: "We execute your custom strategy with precision, using the latest tools and best practices for maximum impact." },
  { step: "04", title: "Monitor & Optimize", description: "Continuous monitoring and optimization ensure your campaigns deliver the best possible results and ROI." }
];

export default function ServicesPage() {
  const [modalServiceId, setModalServiceId] = useState<string | null>(null);

  return (<>
    <V2PageWrapper>
      {/* Hero Section */}
      <section className="relative z-10 v2-section pt-40">
        <div className="v2-container v2-container-wide">
          <div className="max-w-4xl mx-auto" style={{ textAlign: 'center' }}>
            {/* Badge */}
            <div className="v2-badge v2-badge-glass mb-8">
              <Zap className="w-4 h-4 v2-text-primary" />
              <span className="v2-text-primary">Full-Service Marketing Solutions</span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-4xl sm:text-5xl md:text-5xl lg:text-6xl xl:text-7xl font-bold v2-text-primary mb-8 leading-tight">
              Marketing Services That{' '}
              <span className="v2-accent">Drive</span>{' '}
              Growth
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl v2-text-secondary leading-relaxed" style={{ marginBottom: '48px' }}>
              From brand strategy and creative design to SEO and performance marketing, we offer full-service marketing solutions that drive real business growth. Every strategy is custom-crafted to achieve your unique goals.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contact" className="v2-btn v2-btn-primary">
                Get Custom Proposal
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="#process" className="v2-btn v2-btn-secondary">
                View Our Process
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="relative z-10 v2-section">
        <div className="v2-container">
          <div className="max-w-3xl mx-auto" style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div className="v2-badge v2-badge-glass mb-6">
              <Award className="w-4 h-4 v2-text-primary" />
              <span className="v2-text-primary">What We Offer</span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold v2-text-primary mb-8 leading-tight">
              Our <span className="v2-accent">Core Services</span>
            </h2>
            <p className="text-lg md:text-xl v2-text-secondary leading-relaxed">
              End-to-end marketing solutions designed to accelerate your business growth.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.title}
                  id={service.id}
                  className="relative v2-paper rounded-2xl p-5 sm:p-6 md:p-8 hover:shadow-2xl transition-[box-shadow,transform] duration-300 hover:-translate-y-1 scroll-mt-24 cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`Learn more about ${service.title}`}
                  onClick={() => setModalServiceId(service.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setModalServiceId(service.id);
                    }
                  }}
                >
                  {/* Alt anchor IDs for footer links */}
                  {service.altIds?.map((altId) => (
                    <div key={altId} id={altId} style={{ position: 'absolute', top: '-6rem' }} />
                  ))}
                  {/* Icon & Tagline */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-14 h-14 rounded-xl ${service.colorClass} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <p className="text-fm-magenta-600 font-semibold text-sm tracking-wide uppercase">{service.tagline}</p>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-display text-xl font-bold text-fm-neutral-900 mb-3">{service.title}</h3>
                  <p className="text-fm-neutral-600 text-sm mb-6 leading-relaxed">{service.description}</p>

                  {/* Features */}
                  <div className="space-y-2 mb-6">
                    {service.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-fm-magenta-500 flex-shrink-0" />
                        <span className="text-sm text-fm-neutral-600">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Results Badge + Learn More */}
                  <div className="pt-4 border-t border-fm-neutral-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-sm text-fm-magenta-600 font-semibold">{service.results}</p>
                    <span className="text-sm text-fm-magenta-500 font-medium flex items-center gap-1 flex-shrink-0">
                      Learn More <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Wave Divider */}
      <div className="relative" style={{ zIndex: 10, marginTop: '-1px' }}>
        <Image src="/textures/wave-divider.svg" alt="" width={1920} height={60} className="w-full" style={{ height: '60px', display: 'block', transform: 'scaleX(-1)' }} />
      </div>

      {/* Process Section */}
      <section id="process" className="relative z-10 v2-section v2-texture-mesh">
        <div className="v2-container">
          {/* Floating Brain */}
          <div className="absolute right-8 lg:right-20 top-0 hidden lg:block" style={{ zIndex: 10 }}>
            <Image
              src="/3dasset/brain-teaching.webp"
              alt="Our Proven Process"
              width={180}
              height={180}
              loading="lazy"
              className="h-auto animate-v2-hero-float"
              style={{
                width: 'min(180px, 30vw)',
                height: 'auto',
                filter: 'drop-shadow(0 20px 40px rgba(140,25,60,0.2))',
              }}
            />
          </div>

          <div className="max-w-3xl mx-auto" style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div className="v2-badge v2-badge-glass mb-6">
              <Target className="w-4 h-4 v2-text-primary" />
              <span className="v2-text-primary">Our Proven Process</span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold v2-text-primary mb-8 leading-tight">
              A Systematic Approach to{' '}
              <span className="v2-accent">Success</span>
            </h2>
            <p className="text-lg md:text-xl v2-text-secondary leading-relaxed">
              A systematic approach that ensures consistent results and sustainable growth for your business.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-6 lg:gap-8">
            {process.map((step, index) => (
              <div key={step.step} className="v2-paper rounded-2xl p-8 text-center relative">
                <div className="font-display text-5xl font-bold text-fm-magenta-100 mb-4">{step.step}</div>
                <h3 className="font-display text-xl font-bold text-fm-neutral-900 mb-3">{step.title}</h3>
                <p className="text-fm-neutral-600 text-sm leading-relaxed">{step.description}</p>
                {index < process.length - 1 && (
                  <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-fm-neutral-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Wave Divider */}
      <div className="relative" style={{ zIndex: 10, marginTop: '-1px' }}>
        <Image src="/textures/wave-divider.svg" alt="" width={1920} height={60} className="w-full" style={{ height: '60px', display: 'block' }} />
      </div>

      {/* Custom Quote CTA Section */}
      <section className="relative z-10 v2-section v2-texture-dots">
        <div className="v2-container v2-container-narrow">
          <div className="v2-paper rounded-3xl p-8 md:p-12 lg:p-16" style={{ textAlign: 'center' }}>
            <div className="v2-badge v2-badge-light mb-6">
              <Zap className="w-4 h-4" />
              <span>Tailored For You</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-fm-neutral-900 mb-6 leading-tight">
              Every Business Is <span className="text-fm-magenta-600">Different</span>
            </h2>
            <p className="text-fm-neutral-600 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto" style={{ marginBottom: '32px' }}>
              We don&apos;t believe in one-size-fits-all packages. Tell us about your goals and we&apos;ll craft a strategy and plan that fits your business, your market, and your budget.
            </p>

            <div className="grid sm:grid-cols-3 gap-6 max-w-2xl mx-auto" style={{ marginBottom: '40px' }}>
              <div className="p-4">
                <div className="text-3xl font-bold text-fm-magenta-600 mb-1">100%</div>
                <p className="text-sm text-fm-neutral-600">Custom Strategy</p>
              </div>
              <div className="p-4">
                <div className="text-3xl font-bold text-fm-magenta-600 mb-1">No</div>
                <p className="text-sm text-fm-neutral-600">Lock-in Contracts</p>
              </div>
              <div className="p-4">
                <div className="text-3xl font-bold text-fm-magenta-600 mb-1">Free</div>
                <p className="text-sm text-fm-neutral-600">Initial Consultation</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/get-started" className="v2-btn v2-btn-magenta">
                Get Your Custom Proposal
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/contact" className="v2-btn v2-btn-outline">
                Talk to Us First
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 v2-section pb-32">
        <div className="v2-container v2-container-narrow">
          <div className="v2-paper rounded-3xl p-6 sm:p-8 md:p-10 lg:p-14" style={{ textAlign: 'center' }}>
            <div className="v2-badge v2-badge-light mb-6">
              <Target className="w-4 h-4" />
              <span>Ready to Get Started?</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-fm-neutral-900 mb-6 leading-tight">
              Ready to Accelerate Your Growth?
            </h2>
            <p className="text-fm-neutral-600 mb-8 max-w-xl mx-auto">
              Let's discuss your goals and create a custom marketing strategy that drives real results for your business.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contact" className="v2-btn v2-btn-magenta">
                Start Your Project Today
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="tel:+919833257659" className="v2-btn v2-btn-outline">
                Call +91 98332 57659
              </Link>
            </div>
          </div>
        </div>
      </section>
    </V2PageWrapper>

    <ServiceDeepDiveModal
      isOpen={!!modalServiceId}
      onClose={() => setModalServiceId(null)}
      serviceId={modalServiceId}
    />
  </>
  );
}
