import type { Metadata } from "next";
import { OG_DEFAULTS } from '@/lib/seo';

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Read the Terms of Service for Freaking Minds. Understand your rights and obligations when using our marketing and creative services.",
  openGraph: {
    ...OG_DEFAULTS,
    title: "Terms of Service | Freaking Minds",
    description: "Read the Terms of Service for Freaking Minds.",
  },
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
