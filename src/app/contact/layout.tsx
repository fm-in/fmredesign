import type { Metadata } from 'next';
import { OG_DEFAULTS } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Contact Us — Get a Free Consultation',
  description:
    'Ready to grow your brand? Get a free marketing consultation. Message us on WhatsApp or send us a note. India-based, serving brands worldwide.',
  alternates: { canonical: '/contact' },
  openGraph: {
    ...OG_DEFAULTS,
    title: 'Contact Freaking Minds — Free Marketing Consultation',
    description: 'Email, WhatsApp or send us a brief — we reply within 24 hours.',
    url: '/contact',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
