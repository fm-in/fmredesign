'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Menu, X, ChevronDown, ArrowRight, Search, Zap, Palette,
  Code, Video, BarChart3, Users, Sparkles, Layers, Rocket,
  Brain, Target, Megaphone, Globe, PenTool, Play
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// NAVBAR STYLE 1: MEGA MENU WITH TOOLS SHOWCASE
// Premium agency style with hover dropdowns
// ═══════════════════════════════════════════════════════════════════════════════

function NavbarMegaMenu() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const tools = [
    { name: 'Deep Dive', icon: Brain, desc: 'AI-powered brand analysis', href: '/tools/deep-dive', color: 'from-violet-500 to-purple-600' },
    { name: 'Brand Skits', icon: Video, desc: 'Viral video creator', href: '/tools/brand-skits', color: 'from-pink-500 to-rose-600' },
    { name: 'WeBuild', icon: Code, desc: 'Website builder', href: '#', color: 'from-cyan-500 to-blue-600' },
    { name: 'WeCraft', icon: PenTool, desc: 'Design system generator', href: '/tools/wecraft', color: 'from-orange-500 to-amber-600' },
  ];

  const talent = {
    name: 'CreativeMinds',
    icon: Users,
    desc: '500+ verified creative professionals',
    href: '/creativeminds',
    color: 'from-emerald-500 to-teal-600'
  };

  const services = [
    { name: 'SEO', icon: Search, desc: 'Dominate search results', href: '/services#seo' },
    { name: 'Social Media', icon: Megaphone, desc: 'Build engaged communities', href: '/services#social' },
    { name: 'Performance Marketing', icon: BarChart3, desc: 'ROI-focused campaigns', href: '/services#performance' },
    { name: 'Brand Identity', icon: Palette, desc: 'Unforgettable visuals', href: '/services#branding' },
    { name: 'Web Development', icon: Globe, desc: 'Fast, beautiful sites', href: '/services#web' },
    { name: 'Content & Video', icon: Play, desc: 'Stories that convert', href: '/services#content' },
  ];

  const company = [
    { name: 'About Us', icon: Users, desc: 'Our story & team', href: '/about' },
    { name: 'Blog', icon: Layers, desc: 'Insights & updates', href: '/blog' },
    { name: 'Contact', icon: Megaphone, desc: 'Get in touch', href: '/contact' },
  ];

  return (
    <nav className="relative bg-[#0a0a0f] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fm-magenta-500 to-fm-orange-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-white">FreakingMinds</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {/* Services Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('services')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center gap-1.5 px-4 py-2 text-white/70 hover:text-white transition-colors text-sm font-medium">
                Services
                <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'services' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'services' && (
                <div className="absolute top-full left-0 pt-2 w-[520px]">
                  <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/50">
                    <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">What We Do</div>
                    <div className="grid grid-cols-2 gap-2">
                      {services.map((service) => (
                        <Link
                          key={service.name}
                          href={service.href}
                          className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-fm-magenta-500/20 transition-colors">
                            <service.icon className="w-5 h-5 text-fm-magenta-400" />
                          </div>
                          <div>
                            <div className="font-medium text-white text-sm">{service.name}</div>
                            <div className="text-xs text-white/50">{service.desc}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <Link href="/services" className="text-sm text-fm-magenta-400 hover:text-fm-magenta-300 flex items-center gap-1">
                        View all services <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Work - No dropdown */}
            <Link href="/work" className="px-4 py-2 text-white/70 hover:text-white transition-colors text-sm font-medium">Work</Link>

            {/* Products Dropdown (Tools + Talent) */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('products')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center gap-1.5 px-4 py-2 text-white/70 hover:text-white transition-colors text-sm font-medium">
                Products
                <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'products' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'products' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[420px]">
                  <div className="bg-[#12121a] border border-white/10 rounded-2xl p-5 shadow-2xl shadow-black/50">
                    {/* Tools Section */}
                    <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Tools</div>
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      {tools.map((tool) => (
                        <Link
                          key={tool.name}
                          href={tool.href}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tool.color} flex items-center justify-center shadow-md`}>
                            <tool.icon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-white text-sm group-hover:text-fm-orange-400 transition-colors">{tool.name}</div>
                            <div className="text-[11px] text-white/50 leading-tight">{tool.desc}</div>
                          </div>
                        </Link>
                      ))}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-white/10 my-4" />

                    {/* Talent Section */}
                    <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Talent Network</div>
                    <Link
                      href={talent.href}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group bg-gradient-to-r from-white/[0.02] to-transparent"
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${talent.color} flex items-center justify-center shadow-lg`}>
                        <talent.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-white text-sm group-hover:text-emerald-400 transition-colors">{talent.name}</div>
                        <div className="text-xs text-white/50">{talent.desc}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Company Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('company')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center gap-1.5 px-4 py-2 text-white/70 hover:text-white transition-colors text-sm font-medium">
                Company
                <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'company' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'company' && (
                <div className="absolute top-full right-0 pt-2 w-[280px]">
                  <div className="bg-[#12121a] border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/50">
                    <div className="space-y-1">
                      {company.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                          <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-fm-magenta-500/20 transition-colors">
                            <item.icon className="w-4 h-4 text-fm-magenta-400" />
                          </div>
                          <div>
                            <div className="font-medium text-white text-sm">{item.name}</div>
                            <div className="text-xs text-white/50">{item.desc}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="hidden lg:flex items-center gap-4">
            <Link
              href="/get-started"
              className="px-6 py-2.5 bg-gradient-to-r from-fm-magenta-500 to-fm-orange-500 text-white text-sm font-semibold rounded-full hover:shadow-lg hover:shadow-fm-magenta-500/25 transition-all"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#0a0a0f] border-t border-white/10 p-6 max-h-[80vh] overflow-y-auto">
          <div className="space-y-6">
            {/* Services */}
            <div>
              <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Services</div>
              <div className="grid grid-cols-2 gap-2">
                {services.map((service) => (
                  <Link key={service.name} href={service.href} className="flex items-center gap-2 p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/5">
                    <service.icon className="w-4 h-4 text-fm-magenta-400" />
                    <span className="text-sm">{service.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Work */}
            <div className="pt-4 border-t border-white/10">
              <Link href="/work" className="flex items-center justify-between p-3 text-white hover:bg-white/5 rounded-xl">
                <span className="font-medium">Work</span>
                <ArrowRight className="w-4 h-4 text-white/40" />
              </Link>
            </div>

            {/* Products - Tools + Talent */}
            <div className="pt-4 border-t border-white/10">
              <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Products</div>

              {/* Tools */}
              <div className="mb-4">
                <div className="text-[11px] font-medium text-white/30 uppercase tracking-wider mb-2 pl-2">Tools</div>
                <div className="space-y-1">
                  {tools.map((tool) => (
                    <Link key={tool.name} href={tool.href} className="flex items-center gap-3 p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/5">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tool.color} flex items-center justify-center`}>
                        <tool.icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{tool.name}</div>
                        <div className="text-xs text-white/50">{tool.desc}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Talent Network */}
              <div>
                <div className="text-[11px] font-medium text-white/30 uppercase tracking-wider mb-2 pl-2">Talent Network</div>
                <Link href={talent.href} className="flex items-center gap-3 p-3 text-white/70 hover:text-white rounded-xl hover:bg-white/5 bg-gradient-to-r from-white/[0.02] to-transparent">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${talent.color} flex items-center justify-center`}>
                    <talent.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">{talent.name}</div>
                    <div className="text-xs text-white/50">{talent.desc}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/30" />
                </Link>
              </div>
            </div>

            {/* Company */}
            <div className="pt-4 border-t border-white/10">
              <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Company</div>
              <div className="flex gap-4">
                {company.map((item) => (
                  <Link key={item.name} href={item.href} className="text-sm text-white/70 hover:text-white">{item.name}</Link>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Link
              href="/get-started"
              className="block w-full text-center mt-4 px-6 py-3 bg-gradient-to-r from-fm-magenta-500 to-fm-orange-500 text-white text-sm font-semibold rounded-full"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAVBAR STYLE 2: CENTERED LOGO WITH SPLIT NAVIGATION
// Editorial/Magazine style
// ═══════════════════════════════════════════════════════════════════════════════

function NavbarCenteredSplit() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="relative bg-[#faf9f6] border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Left Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            <Link href="/services" className="text-stone-600 hover:text-stone-900 font-medium transition-colors">Services</Link>
            <Link href="/work" className="text-stone-600 hover:text-stone-900 font-medium transition-colors">Work</Link>
            <div className="relative group">
              <button className="flex items-center gap-1 text-stone-600 hover:text-stone-900 font-medium transition-colors">
                Tools <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="bg-white rounded-xl shadow-xl border border-stone-100 p-2 min-w-[200px]">
                  <Link href="/tools/deep-dive" className="block px-4 py-2 text-stone-600 hover:bg-stone-50 rounded-lg">Deep Dive</Link>
                  <Link href="/tools/brand-skits" className="block px-4 py-2 text-stone-600 hover:bg-stone-50 rounded-lg">Brand Skits</Link>
                  <Link href="/tools/webuild" className="block px-4 py-2 text-stone-600 hover:bg-stone-50 rounded-lg">WeBuild</Link>
                  <Link href="/tools/wecraft" className="block px-4 py-2 text-stone-600 hover:bg-stone-50 rounded-lg">WeCraft</Link>
                </div>
              </div>
            </div>
          </div>

          {/* Center Logo */}
          <Link href="/" className="flex flex-col items-center">
            <span className="font-display text-2xl font-bold text-stone-900 tracking-tight">FREAKING</span>
            <span className="font-display text-sm tracking-[0.3em] text-stone-500 -mt-1">MINDS</span>
          </Link>

          {/* Right Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            <Link href="/creativeminds" className="text-stone-600 hover:text-stone-900 font-medium transition-colors">Talent</Link>
            <Link href="/about" className="text-stone-600 hover:text-stone-900 font-medium transition-colors">About</Link>
            <Link href="/blog" className="text-stone-600 hover:text-stone-900 font-medium transition-colors">Journal</Link>
            <Link
              href="/contact"
              className="px-5 py-2 bg-stone-900 text-white font-medium rounded-full hover:bg-stone-800 transition-colors"
            >
              Contact
            </Link>
          </div>

          {/* Mobile */}
          <button className="lg:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-6 h-6 text-stone-900" /> : <Menu className="w-6 h-6 text-stone-900" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-[#faf9f6] border-t border-stone-200 p-6 space-y-4">
          <Link href="/services" className="block text-stone-600">Services</Link>
          <Link href="/work" className="block text-stone-600">Work</Link>
          <Link href="/tools/deep-dive" className="block text-stone-600 pl-4">— Deep Dive</Link>
          <Link href="/tools/brand-skits" className="block text-stone-600 pl-4">— Brand Skits</Link>
          <Link href="/tools/webuild" className="block text-stone-600 pl-4">— WeBuild</Link>
          <Link href="/tools/wecraft" className="block text-stone-600 pl-4">— WeCraft</Link>
          <Link href="/creativeminds" className="block text-stone-600">Talent</Link>
          <Link href="/about" className="block text-stone-600">About</Link>
          <Link href="/blog" className="block text-stone-600">Journal</Link>
        </div>
      )}
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAVBAR STYLE 3: TOOL-FIRST HORIZONTAL TABS
// SaaS/Product-focused style
// ═══════════════════════════════════════════════════════════════════════════════

function NavbarToolFirst() {
  const [activeTab, setActiveTab] = useState('tools');

  const tools = [
    { name: 'Deep Dive', icon: Brain, color: 'bg-violet-500' },
    { name: 'Brand Skits', icon: Video, color: 'bg-pink-500' },
    { name: 'WeBuild', icon: Code, color: 'bg-cyan-500' },
    { name: 'WeCraft', icon: PenTool, color: 'bg-orange-500' },
  ];

  return (
    <nav className="relative">
      {/* Top Bar - Secondary Nav */}
      <div className="bg-[#18181b] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-10 text-sm">
            <div className="flex items-center gap-6">
              <Link href="/about" className="text-zinc-400 hover:text-white transition-colors">About</Link>
              <Link href="/blog" className="text-zinc-400 hover:text-white transition-colors">Blog</Link>
              <Link href="/creativeminds" className="text-zinc-400 hover:text-white transition-colors">CreativeMinds</Link>
            </div>
            <Link href="/contact" className="text-zinc-400 hover:text-white transition-colors">Contact Us</Link>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <div className="bg-[#09090b]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 via-pink-500 to-orange-500" />
              <span className="font-bold text-white text-lg">FreakingMinds</span>
            </Link>

            {/* Main Tabs */}
            <div className="hidden md:flex items-center bg-zinc-900 rounded-full p-1">
              <button
                onClick={() => setActiveTab('tools')}
                className={`px-5 py-2 rounded-full font-medium text-sm transition-all ${
                  activeTab === 'tools' ? 'bg-white text-zinc-900' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Tools
              </button>
              <button
                onClick={() => setActiveTab('services')}
                className={`px-5 py-2 rounded-full font-medium text-sm transition-all ${
                  activeTab === 'services' ? 'bg-white text-zinc-900' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Services
              </button>
              <button
                onClick={() => setActiveTab('work')}
                className={`px-5 py-2 rounded-full font-medium text-sm transition-all ${
                  activeTab === 'work' ? 'bg-white text-zinc-900' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Work
              </button>
            </div>

            {/* CTA */}
            <Link
              href="/get-started"
              className="hidden md:flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold rounded-full text-sm hover:opacity-90 transition-opacity"
            >
              Get Started <Rocket className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Sub-navigation based on active tab */}
      <div className="bg-zinc-950 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-2 h-14 overflow-x-auto">
            {activeTab === 'tools' && tools.map((tool) => (
              <Link
                key={tool.name}
                href={`/tools/${tool.name.toLowerCase().replace(' ', '-')}`}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-full text-sm text-white whitespace-nowrap transition-colors"
              >
                <div className={`w-5 h-5 rounded ${tool.color} flex items-center justify-center`}>
                  <tool.icon className="w-3 h-3 text-white" />
                </div>
                {tool.name}
              </Link>
            ))}
            {activeTab === 'services' && (
              <>
                <Link href="/services#seo" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-full text-sm text-white whitespace-nowrap">SEO</Link>
                <Link href="/services#social" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-full text-sm text-white whitespace-nowrap">Social Media</Link>
                <Link href="/services#ppc" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-full text-sm text-white whitespace-nowrap">PPC</Link>
                <Link href="/services#branding" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-full text-sm text-white whitespace-nowrap">Branding</Link>
                <Link href="/services#web" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-full text-sm text-white whitespace-nowrap">Web Dev</Link>
                <Link href="/services#content" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-full text-sm text-white whitespace-nowrap">Content</Link>
              </>
            )}
            {activeTab === 'work' && (
              <>
                <Link href="/work#case-studies" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-full text-sm text-white whitespace-nowrap">Case Studies</Link>
                <Link href="/work#portfolio" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-full text-sm text-white whitespace-nowrap">Portfolio</Link>
                <Link href="/work#testimonials" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-full text-sm text-white whitespace-nowrap">Testimonials</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAVBAR STYLE 4: MINIMALIST WITH FLOATING TOOLS BAR
// Apple/Linear inspired
// ═══════════════════════════════════════════════════════════════════════════════

function NavbarMinimalistFloat() {
  const [toolsOpen, setToolsOpen] = useState(false);

  const tools = [
    { name: 'Deep Dive', icon: Brain, desc: 'AI Brand Analysis', gradient: 'from-violet-600 to-indigo-600' },
    { name: 'Brand Skits', icon: Video, desc: 'Viral Video Creator', gradient: 'from-pink-600 to-rose-600' },
    { name: 'WeBuild', icon: Code, desc: 'Website Builder', gradient: 'from-cyan-600 to-blue-600' },
    { name: 'WeCraft', icon: PenTool, desc: 'Design Generator', gradient: 'from-amber-600 to-orange-600' },
  ];

  return (
    <>
      <nav className="relative bg-white/80 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="font-display text-xl font-bold text-zinc-900">
              freakingminds
            </Link>

            {/* Center Nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/services" className="text-zinc-600 hover:text-zinc-900 text-sm font-medium transition-colors">Services</Link>
              <Link href="/work" className="text-zinc-600 hover:text-zinc-900 text-sm font-medium transition-colors">Work</Link>
              <button
                onClick={() => setToolsOpen(!toolsOpen)}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${toolsOpen ? 'text-zinc-900' : 'text-zinc-600 hover:text-zinc-900'}`}
              >
                <Sparkles className="w-4 h-4" />
                Tools
              </button>
              <Link href="/creativeminds" className="text-zinc-600 hover:text-zinc-900 text-sm font-medium transition-colors">Talent</Link>
              <Link href="/about" className="text-zinc-600 hover:text-zinc-900 text-sm font-medium transition-colors">About</Link>
            </div>

            {/* Right */}
            <div className="flex items-center gap-4">
              <Link href="/blog" className="hidden md:block text-zinc-600 hover:text-zinc-900 text-sm font-medium transition-colors">Blog</Link>
              <Link
                href="/get-started"
                className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-full hover:bg-zinc-800 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Floating Tools Bar */}
      {toolsOpen && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl shadow-black/10 border border-black/5 p-2 flex items-center gap-2">
            {tools.map((tool) => (
              <Link
                key={tool.name}
                href={`/tools/${tool.name.toLowerCase().replace(' ', '-')}`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-50 transition-colors group"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg`}>
                  <tool.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-zinc-900 text-sm">{tool.name}</div>
                  <div className="text-xs text-zinc-500">{tool.desc}</div>
                </div>
              </Link>
            ))}
            <button
              onClick={() => setToolsOpen(false)}
              className="ml-2 p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAVBAR STYLE 5: GLASSMORPHIC WITH DOCK
// macOS Dock inspired tools showcase
// ═══════════════════════════════════════════════════════════════════════════════

function NavbarGlassDock() {
  const tools = [
    { name: 'Deep Dive', icon: Brain, color: '#8B5CF6' },
    { name: 'Brand Skits', icon: Video, color: '#EC4899' },
    { name: 'WeBuild', icon: Code, color: '#06B6D4' },
    { name: 'WeCraft', icon: PenTool, color: '#F59E0B' },
  ];

  return (
    <>
      {/* Main Nav */}
      <nav className="relative bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fm-magenta-400 to-fm-orange-400" />
              <span className="font-display text-lg font-bold text-white">FreakingMinds</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link href="/services" className="text-white/70 hover:text-white text-sm transition-colors">Services</Link>
              <Link href="/work" className="text-white/70 hover:text-white text-sm transition-colors">Work</Link>
              <Link href="/creativeminds" className="text-white/70 hover:text-white text-sm transition-colors">Talent</Link>
              <Link href="/about" className="text-white/70 hover:text-white text-sm transition-colors">About</Link>
              <Link href="/blog" className="text-white/70 hover:text-white text-sm transition-colors">Blog</Link>
            </div>

            <Link
              href="/contact"
              className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-full border border-white/20 transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </nav>

      {/* Floating Dock - Tools */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-2 border border-white/10 shadow-2xl flex items-center gap-1">
          {tools.map((tool, index) => (
            <Link
              key={tool.name}
              href={`/tools/${tool.name.toLowerCase().replace(' ', '-')}`}
              className="group relative p-3 rounded-xl hover:bg-white/10 transition-all hover:scale-110"
              style={{ transitionDelay: `${index * 25}ms` }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: tool.color }}
              >
                <tool.icon className="w-5 h-5 text-white" />
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/80 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
                {tool.name}
              </div>
            </Link>
          ))}
          <div className="w-px h-8 bg-white/20 mx-2" />
          <Link
            href="/get-started"
            className="p-3 rounded-xl bg-gradient-to-br from-fm-magenta-500 to-fm-orange-500 hover:scale-110 transition-transform"
          >
            <Rocket className="w-5 h-5 text-white" />
          </Link>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHOWCASE PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function NavbarShowcasePage() {
  const navbarStyles = [
    {
      id: 'mega-menu',
      name: 'Mega Menu Premium',
      desc: 'Full-featured dropdown menus with tool showcase. Best for comprehensive navigation.',
      component: NavbarMegaMenu,
      bgClass: 'bg-[#0a0a0f]',
      textClass: 'text-white'
    },
    {
      id: 'centered-split',
      name: 'Centered Editorial',
      desc: 'Magazine-style split navigation with centered branding. Elegant and sophisticated.',
      component: NavbarCenteredSplit,
      bgClass: 'bg-[#faf9f6]',
      textClass: 'text-stone-900'
    },
    {
      id: 'tool-first',
      name: 'Tool-First Tabs',
      desc: 'SaaS-style tabbed navigation highlighting products/tools prominently.',
      component: NavbarToolFirst,
      bgClass: 'bg-[#09090b]',
      textClass: 'text-white'
    },
    {
      id: 'minimalist-float',
      name: 'Minimalist + Float',
      desc: 'Clean Apple-inspired nav with floating tools panel on demand.',
      component: NavbarMinimalistFloat,
      bgClass: 'bg-zinc-100',
      textClass: 'text-zinc-900'
    },
    {
      id: 'glass-dock',
      name: 'Glass + Dock',
      desc: 'macOS-inspired dock for tools with glassmorphic main nav.',
      component: NavbarGlassDock,
      bgClass: 'bg-gradient-to-br from-violet-900 via-purple-900 to-pink-900',
      textClass: 'text-white'
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Link href="/wehave" className="text-sm text-zinc-500 hover:text-white mb-4 inline-flex items-center gap-2">
            <ArrowRight className="w-4 h-4 rotate-180" /> Back to WeHave
          </Link>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mt-4">
            Navbar Showcase
          </h1>
          <p className="text-xl text-zinc-400 mt-4 max-w-2xl">
            5 distinct navbar styles designed for FreakingMinds. Each showcases your internal tools
            (Deep Dive, Brand Skits, WeBuild, WeCraft) in different ways.
          </p>
        </div>
      </div>

      {/* Navbar Previews */}
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        {navbarStyles.map((style, index) => (
          <div key={style.id} className="space-y-4">
            {/* Label */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-mono text-zinc-500">0{index + 1}</span>
              <div>
                <h2 className="text-xl font-bold text-white">{style.name}</h2>
                <p className="text-zinc-400 text-sm">{style.desc}</p>
              </div>
            </div>

            {/* Preview Container */}
            <div className={`rounded-2xl overflow-hidden border border-white/10 ${style.bgClass}`}>
              <style.component />

              {/* Demo Content Area */}
              <div className={`h-[300px] flex items-center justify-center ${style.textClass}`}>
                <div className="text-center opacity-30">
                  <Layers className="w-12 h-12 mx-auto mb-4" />
                  <p className="font-medium">Page Content Area</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <div className="border-t border-white/10 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="font-display text-2xl font-bold text-white mb-6">Recommendation</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-fm-magenta-500/20 to-fm-orange-500/20 border border-fm-magenta-500/30">
              <h3 className="font-bold text-white text-lg mb-2">For Your Dark Theme (Current)</h3>
              <p className="text-zinc-300 mb-4">
                <strong>Mega Menu Premium</strong> or <strong>Glass + Dock</strong> would work best.
                They showcase tools prominently while maintaining the premium dark aesthetic.
              </p>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-white/10 text-white text-xs rounded-full">Tool-focused</span>
                <span className="px-3 py-1 bg-white/10 text-white text-xs rounded-full">Premium feel</span>
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-bold text-white text-lg mb-2">For Light/Editorial Pages</h3>
              <p className="text-zinc-300 mb-4">
                <strong>Centered Editorial</strong> or <strong>Minimalist + Float</strong> offer
                elegant alternatives for specific pages or a complete rebrand direction.
              </p>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-white/10 text-white text-xs rounded-full">Sophisticated</span>
                <span className="px-3 py-1 bg-white/10 text-white text-xs rounded-full">Clean</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
