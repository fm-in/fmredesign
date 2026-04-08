import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get Started — Tell Us About Your Project',
  description:
    "Start your project with Freaking Minds. Tell us about your business goals, budget, and timeline — we'll craft a custom marketing strategy for you.",
  alternates: { canonical: '/get-started' },
  openGraph: {
    title: 'Start Your Project — Freaking Minds',
    description: 'Tell us about your goals and get a custom marketing strategy tailored to your business.',
    url: 'https://freakingminds.in/get-started',
  },
};

export default function GetStartedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
