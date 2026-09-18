/**
 * Deliberately plain. `V2PageWrapper` is a marketing surface; a 404 is not one,
 * and it must render even when the marketing theme is mid-migration.
 */
import Link from 'next/link';
import { ArrowRight, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="bg-fm-neutral-50">
      <section className="min-h-[70vh] flex items-center justify-center py-16 md:py-24">
        <div className="v2-container">
          <div className="max-w-2xl mx-auto" style={{ textAlign: 'center' }}>
            <img
              src="/3dasset/brain-confused.webp"
              alt="Page not found"
              loading="lazy"
              className="mx-auto mb-8"
              style={{
                width: 'min(160px, 40vw)',
                height: 'auto',
                filter: 'drop-shadow(0 20px 40px rgba(140,25,60,0.2))',
              }}
            />

            <h1 className="font-display text-7xl sm:text-8xl md:text-9xl font-bold text-fm-magenta-600 mb-4">
              404
            </h1>

            <h2 className="font-display text-2xl md:text-3xl font-bold text-fm-neutral-900 mb-6">
              Oops! Page Not Found
            </h2>

            <p className="text-lg text-fm-neutral-600 mb-10 leading-relaxed max-w-md mx-auto">
              The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
              Let&rsquo;s get you back on track.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/" className="v2-btn v2-btn-magenta">
                <Home className="w-5 h-5" />
                Back to Homepage
              </Link>
              <Link href="/contact" className="v2-btn v2-btn-outline">
                Contact Us
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
