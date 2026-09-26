import type { Metadata } from 'next';

/**
 * Share links are per-recipient and token-gated. The page is a client
 * component with no metadata of its own, so it inherited the root's
 * `index, follow` and a canonical of '/'. next.config also sends an
 * X-Robots-Tag for /shared/*; this keeps the HTML consistent with it.
 */
export const metadata: Metadata = {
  title: 'Shared update',
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
