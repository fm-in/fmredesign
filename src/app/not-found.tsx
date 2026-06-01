import Link from 'next/link';
import { V2PageWrapper } from '@/components/layouts/V2PageWrapper';
import { ArrowRight, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <V2PageWrapper>
      <section className="relative z-10 min-h-screen flex items-center justify-center v2-section">
        <div className="v2-container">
          <div className="max-w-2xl mx-auto" style={{ textAlign: 'center' }}>
            {/* Brain Mascot */}
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

            {/* 404 */}
            <h1 className="font-display text-7xl sm:text-8xl md:text-9xl font-bold v2-accent mb-4">
              404
            </h1>

            <h2 className="font-display text-2xl md:text-3xl font-bold v2-text-primary mb-6">
              Oops! Page Not Found
            </h2>

            <p className="text-lg v2-text-secondary mb-10 leading-relaxed max-w-md mx-auto">
              The page you're looking for doesn't exist or has been moved.
              Let's get you back on track.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/" className="v2-btn v2-btn-primary">
                <Home className="w-5 h-5" />
                Back to Homepage
              </Link>
              <Link href="/contact" className="v2-btn v2-btn-secondary">
                Contact Us
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </V2PageWrapper>
  );
}
