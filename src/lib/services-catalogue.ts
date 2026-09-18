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
    title: 'Search Engine Optimization (SEO)',
    tagline: 'Get found. Get chosen.',
    navDesc: 'Dominate search results',
    description:
      'Dominate search results with our data-driven SEO strategies. We optimize your website for visibility, traffic, and conversions.',
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
      'Build engaged communities and drive brand awareness across all major social platforms with strategic content and campaigns.',
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
    title: 'Pay-Per-Click (PPC) Advertising',
    tagline: 'Every rupee. Maximum impact.',
    navDesc: 'ROI-focused campaigns',
    description:
      'Maximize your ROI with targeted PPC campaigns across Google Ads, Facebook, and other platforms.',
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
    title: 'Creative Design & Branding',
    tagline: 'Look unforgettable.',
    navDesc: 'Unforgettable visuals',
    description:
      'Create compelling visual identities and marketing materials that resonate with your target audience.',
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
    title: 'Website Design & Development',
    tagline: 'Fast. Beautiful. Converting.',
    navDesc: 'Fast, beautiful sites',
    description:
      'Build fast, responsive, and conversion-optimized websites that serve as powerful marketing tools.',
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
    title: 'Content Marketing & Video Production',
    tagline: 'Stories that sell.',
    navDesc: 'Stories that convert',
    description:
      'Engage your audience with high-quality content that tells your brand story and drives action.',
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
