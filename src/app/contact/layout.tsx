import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us — Get a Free Consultation',
  description:
    'Ready to grow your brand? Contact Freaking Minds for a free marketing consultation. Call +91 98332 57659 or fill out our form. Based in Bhopal, serving brands worldwide.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact Freaking Minds — Free Marketing Consultation',
    description: 'Get in touch for a free consultation. Call, email, or book a meeting with our team.',
    url: 'https://freakingminds.in/contact',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
