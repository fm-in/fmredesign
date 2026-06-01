'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { V2PageWrapper } from '@/components/layouts/V2PageWrapper';
import { RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <V2PageWrapper>
      <section className="relative z-10 min-h-screen flex items-center justify-center v2-section">
        <div className="v2-container">
          <div className="max-w-2xl mx-auto" style={{ textAlign: 'center' }}>
            {/* Brain Mascot */}
            <img
              src="/3dasset/brain-confused.webp"
              alt="Something went wrong"
              loading="lazy"
              className="mx-auto mb-8"
              style={{
                width: 'min(160px, 40vw)',
                height: 'auto',
                filter: 'drop-shadow(0 20px 40px rgba(140,25,60,0.2))',
              }}
            />

            <h1 className="font-display text-3xl md:text-4xl font-bold v2-text-primary mb-6">
              Something Went Wrong
            </h1>

            <p className="text-lg v2-text-secondary mb-10 leading-relaxed max-w-md mx-auto">
              We encountered an unexpected error. Don't worry, our team has been
              notified and is working on it.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={reset} className="v2-btn v2-btn-primary">
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
              <Link href="/" className="v2-btn v2-btn-secondary">
                <Home className="w-5 h-5" />
                Back to Homepage
              </Link>
            </div>
          </div>
        </div>
      </section>
    </V2PageWrapper>
  );
}
