import type { Metadata } from 'next';
import { OG_DEFAULTS } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Contact Us — Get a Free Consultation',
  description:
    'Ready to grow your brand? Get a free marketing consultation. Call +91 98332 57659 or send us a message. Based in Bhopal, serving India.',
  alternates: { canonical: '/contact' },
  openGraph: {
    ...OG_DEFAULTS,
    title: 'Contact Freaking Minds — Free Marketing Consultation',
    description: 'Get in touch for a free consultation. Call, email, or book a meeting with our team.',
    url: '/contact',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
