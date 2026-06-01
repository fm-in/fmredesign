'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Facebook, Instagram, Linkedin, Twitter, Sparkles, Send, Mail, Phone, MapPin } from 'lucide-react';

const navigation = {
  services: [
    { name: 'Brand Strategy', href: '/services#brand-strategy' },
    { name: 'Performance Marketing', href: '/services#performance-marketing' },
    { name: 'Creative & Content', href: '/services#creative-content' },
    { name: 'Digital Experience', href: '/services#digital-experience' },
  ],
  company: [
    { name: 'About', href: '/about' },
    { name: 'Work', href: '/work' },
    { name: 'Blog', href: '/blog' },
    { name: 'Contact', href: '/contact' },
  ],
  resources: [
    { name: 'Blog', href: '/blog' },
    { name: 'FM Academy', href: '/academy' },
    { name: 'Get Started', href: '/get-started' },
    { name: 'CreativeMinds', href: '/creativeminds' },
  ],
  legal: [
    { name: 'Privacy', href: '/privacy' },
    { name: 'Terms', href: '/terms' },
  ],
};

const socialLinks = [
  { name: 'Facebook', icon: Facebook, href: 'https://www.facebook.com/Freakingmindsdigital' },
  { name: 'Instagram', icon: Instagram, href: 'https://www.instagram.com/freakingminds' },
  { name: 'LinkedIn', icon: Linkedin, href: 'https://www.linkedin.com/company/freaking-minds' },
  { name: 'Twitter', icon: Twitter, href: 'https://twitter.com/freakingminds' },
];

export function FooterV2() {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');

  return (
    <footer className="relative" style={{ borderTop: '1px solid rgba(201, 50, 93, 0.1)' }}>
      {/* Row 1 — Brand Statement + CTA */}
      <div style={{ background: 'rgba(255, 255, 255, 0.25)' }}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 py-16 lg:py-20">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4" style={{ color: '#8c1d4a' }} />
                <span className="text-[11px] uppercase tracking-[0.25em] font-semibold" style={{ color: '#8c1d4a' }}>
                  Let&apos;s work together
                </span>
              </div>
              <h2
                className="font-display text-3xl md:text-4xl font-bold leading-tight v2-text-primary"
              >
                We help brands grow through{' '}
                <span
                  className="font-accent italic font-normal"
                  style={{
                    background: 'linear-gradient(135deg, #8c1d4a, #ff7f50)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  strategy, creativity & performance
                </span>
              </h2>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-sm transition-[filter] duration-300 hover:brightness-110 shrink-0 group"
              style={{
                background: 'linear-gradient(135deg, #8c1d4a, #a82548)',
                color: 'white',
              }}
            >
              Start a Project
              <ArrowUpRight className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
            </Link>
          </div>
        </div>
      </div>

      {/* Row 2 — Navigation Columns */}
      <div style={{ borderTop: '1px solid rgba(201, 50, 93, 0.08)' }}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Services */}
            <div>
              <h4
                className="text-[11px] font-bold uppercase tracking-[0.25em] mb-5"
                style={{ color: '#8c1d4a' }}
              >
                Services
              </h4>
              <ul className="space-y-2.5">
                {navigation.services.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="v2-text-secondary text-[14px] transition-colors"
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#8c1d4a')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '')}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4
                className="text-[11px] font-bold uppercase tracking-[0.25em] mb-5"
                style={{ color: '#8c1d4a' }}
              >
                Company
              </h4>
              <ul className="space-y-2.5">
                {navigation.company.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="v2-text-secondary text-[14px] transition-colors"
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#8c1d4a')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '')}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4
                className="text-[11px] font-bold uppercase tracking-[0.25em] mb-5"
                style={{ color: '#8c1d4a' }}
              >
                Resources
              </h4>
              <ul className="space-y-2.5">
                {navigation.resources.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="v2-text-secondary text-[14px] transition-colors"
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#8c1d4a')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '')}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4
                className="text-[11px] font-bold uppercase tracking-[0.25em] mb-5"
                style={{ color: '#8c1d4a' }}
              >
                Legal
              </h4>
              <ul className="space-y-2.5">
                {navigation.legal.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="v2-text-secondary text-[14px] transition-colors"
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#8c1d4a')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '')}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3 — Contact + Social + Newsletter */}
      <div style={{ borderTop: '1px solid rgba(201, 50, 93, 0.08)', background: 'rgba(255, 255, 255, 0.15)' }}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {/* Contact */}
            <div className="space-y-2 v2-text-secondary text-[13px]">
              <h4
                className="text-[11px] font-bold uppercase tracking-[0.25em] mb-4"
                style={{ color: '#8c1d4a' }}
              >
                Contact
              </h4>
              <a href="mailto:freakingmindsdigital@gmail.com" className="block transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.color = '#8c1d4a')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '')}>
                freakingmindsdigital@gmail.com
              </a>
              <a href="tel:+919833257659" className="block transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.color = '#8c1d4a')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '')}>
                +91 98332 57659
              </a>
              <p className="v2-text-tertiary">India & Worldwide</p>
            </div>

            {/* Social */}
            <div>
              <h4
                className="text-[11px] font-bold uppercase tracking-[0.25em] mb-4"
                style={{ color: '#8c1d4a' }}
              >
                Follow Us
              </h4>
              <div className="flex gap-3">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-xl flex items-center justify-center v2-text-secondary transition-[background-color,color] duration-300"
                      style={{
                        background: 'rgba(201, 50, 93, 0.06)',
                        border: '1px solid rgba(201, 50, 93, 0.1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#8c1d4a';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(201, 50, 93, 0.06)';
                        e.currentTarget.style.color = '';
                      }}
                      aria-label={`Follow us on ${social.name}`}
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Newsletter */}
            <div>
              <h4
                className="text-[11px] font-bold uppercase tracking-[0.25em] mb-4"
                style={{ color: '#8c1d4a' }}
              >
                Newsletter
              </h4>
              <div className="flex flex-col min-[400px]:flex-row gap-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-3 min-[400px]:px-4 py-2.5 rounded-lg text-[13px] outline-none transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(201, 50, 93, 0.12)',
                    color: '#1a0a12',
                  }}
                />
                <button
                  className="px-4 py-2.5 rounded-lg text-white text-[13px] font-medium transition-[filter] hover:brightness-110"
                  style={{ background: '#8c1d4a' }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4 — Bottom Bar */}
      <div style={{ borderTop: '1px solid rgba(201, 50, 93, 0.08)' }}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src="/logo.png"
                alt="Freaking Minds"
                className="w-auto opacity-60"
                style={{ height: '1.5rem' }}
              />
              <span className="v2-text-muted text-[12px]">
                &copy; {currentYear} Freaking Minds. All rights reserved.
              </span>
            </div>
            <span className="v2-text-muted text-[11px]">
              Crafted with care in India
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
