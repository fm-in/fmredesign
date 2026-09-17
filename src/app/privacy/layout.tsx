import type { Metadata } from "next";
import { OG_DEFAULTS } from '@/lib/seo';

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how Freaking Minds collects, uses, and protects your personal information. Read our comprehensive privacy policy.",
  openGraph: {
    ...OG_DEFAULTS,
    title: "Privacy Policy | Freaking Minds",
    description: "Learn how Freaking Minds collects, uses, and protects your personal information.",
  },
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
