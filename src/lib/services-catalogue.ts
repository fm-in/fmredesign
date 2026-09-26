/**
 * The one service catalogue.
 *
 * Before this file there were four: the header dropdown (six services), the
 * footer (four, with entirely different names *and* different anchor ids), the
 * services page (six, canonical) and the contact form's dropdown (eight loose
 * strings). The footer's ids only resolved because `/services` planted hidden
 * `altIds` anchors to catch them.
 *
 * `id` is the anchor on `/services` and the only identifier. Anything that
 * links to a service links through `serviceHref()`, so a rename can never
 * silently break a link again.
 */

import {
  Search,
  Megaphone,
  BarChart3,
  Palette,
  Globe,
  Video,
  type LucideIcon,
} from 'lucide-react';

export interface ServiceEntry {
  /** Anchor id on `/services`. The single identifier for this service. */
  id: string;
  icon: LucideIcon;
  /** Short label — navigation, footers, form options. */
  name: string;
  /** Full heading — the services page. */
  title: string;
  tagline: string;
  /** One line, for dropdown rows. */
  navDesc: string;
  /** Paragraph, for the services page card. */
  description: string;
  features: string[];
  results: string;
  colorClass: string;
}

export const SERVICES: readonly ServiceEntry[] = [
  {
    id: 'seo',
    icon: Search,
    name: 'SEO',
    title: 'Search Engine Optimization',
    tagline: 'Get found. Get chosen.',
    navDesc: 'Dominate search results',
    description:
      'Technical fixes, content and links that move you up for the searches your customers already make.',
    features: [
      'Keyword Research & Strategy',
      'On-page & Technical SEO',
      'Link Building & Content Marketing',
      'Local SEO Optimization',
      'SEO Audits & Reporting',
    ],
    results: 'Proven strategies to boost organic traffic and search visibility',
    colorClass: 'v2-gradient-seo',
  },
  {
    id: 'social',
    icon: Megaphone,
    name: 'Social Media',
    title: 'Social Media Marketing',
    tagline: 'Stop posting. Start connecting.',
    navDesc: 'Build engaged communities',
    description:
      'A plan for each platform, content people stop for, and a community that someone actually answers.',
    features: [
      'Social Media Strategy',
      'Content Creation & Curation',
      'Community Management',
      'Paid Social Advertising',
      'Influencer Partnerships',
    ],
    results: 'Build engaged communities that drive brand awareness',
    colorClass: 'v2-gradient-social',
  },
  {
    id: 'performance',
    icon: BarChart3,
    name: 'Performance Marketing',
    title: 'Performance Marketing',
    tagline: 'Every rupee. Maximum impact.',
    navDesc: 'ROI-focused campaigns',
    description:
      'Search and social ad campaigns on Google and Meta, run against a target you agree up front.',
    features: [
      'Google Ads Management',
      'Facebook & Instagram Ads',
      'Shopping Campaigns',
      'Remarketing Strategies',
      'Conversion Optimization',
    ],
    results: 'Data-driven campaigns that maximize your ad spend ROI',
    colorClass: 'v2-gradient-performance',
  },
  {
    id: 'branding',
    icon: Palette,
    name: 'Brand Identity',
    title: 'Brand Identity Design',
    tagline: 'Look unforgettable.',
    navDesc: 'Unforgettable visuals',
    description:
      'Positioning, logo, typography and guidelines: a system your team can use without us.',
    features: [
      'Brand Identity Design',
      'Logo & Visual Guidelines',
      'Marketing Collateral',
      'Packaging Design',
      'Brand Strategy Consulting',
    ],
    results: 'Build memorable brand identities that stand out',
    colorClass: 'v2-gradient-brand',
  },
  {
    id: 'web',
    icon: Globe,
    name: 'Web Development',
    title: 'Website Development',
    tagline: 'Fast. Beautiful. Converting.',
    navDesc: 'Fast, beautiful sites',
    description:
      'Fast, mobile-first websites built to turn visits into enquiries and sales.',
    features: [
      'Responsive Web Design',
      'E-commerce Development',
      'Landing Page Optimization',
      'CMS Integration',
      'Performance Optimization',
    ],
    results: 'Fast, responsive sites that convert visitors into customers',
    colorClass: 'v2-gradient-web',
  },
  {
    id: 'content',
    icon: Video,
    name: 'Content & Video',
    title: 'Content & Video Production',
    tagline: 'Stories that sell.',
    navDesc: 'Stories that convert',
    description:
      'Films, reels, posts and articles, planned together so each one does a job.',
    features: [
      'Content Strategy',
      'Blog Writing & SEO Content',
      'Video Production',
      'Graphic Design',
      'Email Marketing',
    ],
    results: 'Content that drives engagement and generates quality leads',
    colorClass: 'v2-gradient-content',
  },
];

/** The only way to build a link to a service section. */
export function serviceHref(id: ServiceEntry['id']): string {
  return `/services#${id}`;
}

export function getService(id: string): ServiceEntry | undefined {
  return SERVICES.find((s) => s.id === id);
}

/** Options for the "what do you need?" field on the contact form. */
export const SERVICE_ENQUIRY_OPTIONS: readonly string[] = [
  ...SERVICES.map((s) => s.name),
  'Other',
];
