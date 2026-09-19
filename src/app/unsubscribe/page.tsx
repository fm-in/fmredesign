/**
 * Reached from a link in a sales email. Deliberately plain: no starfield, no
 * marketing background — `V2PageWrapper` is a marketing surface and this is a
 * transactional one.
 */
import type { Metadata } from 'next';
import { UnsubscribeForm } from '@/components/sales/UnsubscribeForm';

export const metadata: Metadata = {
  title: 'Unsubscribe',
  robots: { index: false, follow: false },
  // The token in the URL must not travel to any page this one links to.
  referrer: 'no-referrer',
  alternates: { canonical: '/unsubscribe' },
};

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;

  return (
    <div className="bg-fm-neutral-50">
      <section className="py-16 md:py-24">
        <div className="site-measure site-measure--narrow">
          <div className="bg-white border border-fm-neutral-200 rounded-site-lg p-6 md:p-8" style={{ textAlign: 'center' }}>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-fm-neutral-900 mb-4">Stop follow-up emails</h1>
            <p className="text-fm-neutral-600 mb-8">Confirm below and we will not email you about your enquiry again.</p>
            <UnsubscribeForm token={t ?? ''} />
          </div>
        </div>
      </section>
    </div>
  );
}
