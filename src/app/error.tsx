/**
 * Deliberately plain. This page renders when something else already failed, so
 * it must not depend on the marketing theme (`V2PageWrapper` pulls in GSAP and
 * a client-side starfield — both unnecessary risk on an error boundary).
 */
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
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
    <div className="bg-fm-neutral-50">
      <section className="min-h-[70vh] flex items-center justify-center py-16 md:py-24">
        <div className="v2-container">
          <div className="max-w-2xl mx-auto" style={{ textAlign: 'center' }}>
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

            <h1 className="font-display text-3xl md:text-4xl font-bold text-fm-neutral-900 mb-6">
              Something Went Wrong
            </h1>

            <p className="text-lg text-fm-neutral-600 mb-10 leading-relaxed max-w-md mx-auto">
              We encountered an unexpected error. Don&rsquo;t worry, our team has been
              notified and is working on it.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={reset} className="v2-btn v2-btn-magenta">
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
              <Link href="/" className="v2-btn v2-btn-outline">
                <Home className="w-5 h-5" />
                Back to Homepage
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
