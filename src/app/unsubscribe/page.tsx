import type { Metadata } from 'next';
import { V2PageWrapper } from '@/components/layouts/V2PageWrapper';
import { UnsubscribeForm } from '@/components/sales/UnsubscribeForm';

export const metadata: Metadata = {
  title: 'Unsubscribe',
  robots: { index: false, follow: false },
  alternates: { canonical: '/unsubscribe' },
};

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;

  return (
    <V2PageWrapper>
      <section className="v2-section v2-section--hero v2-section--outro">
        <div className="v2-container-narrow">
          <div className="v2-paper rounded-3xl p-8 md:p-12" style={{ textAlign: 'center' }}>
            <h1 className="v2-h2 text-fm-neutral-900 mb-4">Stop follow-up emails</h1>
            <p className="text-fm-neutral-600 mb-8">Confirm below and we will not email you about your enquiry again.</p>
            <UnsubscribeForm token={t ?? ''} />
          </div>
        </div>
      </section>
    </V2PageWrapper>
  );
}
