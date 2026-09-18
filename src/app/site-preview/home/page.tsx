import type { Metadata } from 'next';

/**
 * The home page is live at `/`. This route stays only so an existing preview
 * link keeps working, and re-exports the real page rather than a copy — a
 * duplicate here would drift the moment either was edited.
 */
export const metadata: Metadata = {
  title: 'Home preview',
  robots: { index: false, follow: false },
  alternates: { canonical: '/site-preview/home' },
};

export { default } from '@/app/page';
