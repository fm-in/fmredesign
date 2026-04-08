import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CreativeMinds — Join Our Talent Network',
  description:
    'Designers, developers, marketers — join the CreativeMinds talent network. Work on exciting projects with top brands. Apply to collaborate with Freaking Minds.',
  alternates: { canonical: '/creativeminds' },
  openGraph: {
    title: 'CreativeMinds Talent Network — Freaking Minds',
    description: 'Join our network of creative professionals. Work on exciting brand projects.',
    url: 'https://freakingminds.in/creativeminds',
  },
};

export default function CreativeMindsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
