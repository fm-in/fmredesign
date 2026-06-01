'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';
import Image from 'next/image';
import {
  Mail,
  AlertCircle,
  Info,
  BarChart3,
  FileText,
  MessageSquare,
  ShieldCheck,
  Loader2,
  ArrowRight,
} from 'lucide-react';

export default function ClientLoginPage() {
  return (
    <Suspense>
      <ClientLoginForm />
    </Suspense>
  );
}

/* -------------------------------------------------------------------------- */
/*  Feature bullet data                                                        */
/* -------------------------------------------------------------------------- */
const portalFeatures = [
  {
    icon: BarChart3,
    title: 'Real-Time Project Tracking',
    description: 'Monitor milestones and deliverables as they happen.',
  },
  {
    icon: FileText,
    title: 'Detailed Progress Reports',
    description: 'Weekly analytics and campaign performance breakdowns.',
  },
  {
    icon: MessageSquare,
    title: 'Direct Communication',
    description: 'Message your dedicated team without leaving the portal.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure & Private',
    description: 'Enterprise-grade encryption protects your data at rest and in transit.',
  },
];

/* -------------------------------------------------------------------------- */
/*  Login form (split layout)                                                  */
/* -------------------------------------------------------------------------- */
function ClientLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get('error') === 'session_expired';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    sessionExpired ? 'Your session has expired. Please log in again.' : null
  );
  const [errorKey, setErrorKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      setErrorKey((k) => k + 1);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/client-portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push(data.data.redirectUrl);
      } else {
        setError(data.error || 'Invalid email or password');
        setErrorKey((k) => k + 1);
      }
    } catch {
      setError('An error occurred. Please try again.');
      setErrorKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen flex flex-col lg:flex-row lg:overflow-hidden">
      {/* ================================================================== */}
      {/*  LEFT PANEL - Brand side (hidden on mobile, shown on lg+)          */}
      {/* ================================================================== */}
      <div
        className="hidden lg:flex lg:w-[52%] relative flex-col justify-between overflow-hidden"
        style={{
          background: `
            linear-gradient(135deg,
              #fef5f8 0%,
              #fce8ef 10%,
              #f9dce6 20%,
              #f5d0de 30%,
              #f2c6d7 40%,
              #f0bfd2 50%,
              #f2c6d7 60%,
              #f5d0de 70%,
              #f9dce6 80%,
              #fce8ef 90%,
              #fef5f8 100%
            )
          `,
        }}
      >
        {/* Decorative gradient orbs — matches V2PageWrapper atmospheric blooms */}
        <div
          className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(120, 20, 60, 0.18) 0%, transparent 50%)',
            top: '-10%',
            right: '-10%',
            zIndex: 0,
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(100, 10, 55, 0.15) 0%, transparent 50%)',
            bottom: '5%',
            left: '-8%',
            zIndex: 0,
          }}
        />
        {/* Vignette overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 0,
            background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 0%, rgba(100, 15, 50, 0.08) 100%)',
          }}
        />

        {/* Content */}
        <div className="relative flex flex-col justify-between h-full px-12 xl:px-16 py-10" style={{ zIndex: 1 }}>
          {/* Top: Logo + headline */}
          <div>
            <Link href="/">
              <Image
                src="/logo.png"
                alt="FreakingMinds"
                width={200}
                height={56}
                className="w-auto mb-14 hover:opacity-80 transition-opacity"
                style={{ height: '3.5rem' }}
                priority
              />
            </Link>

            <h1
              className="font-display text-4xl xl:text-5xl font-bold leading-tight mb-6 text-fm-neutral-900"
            >
              Your projects,{' '}
              <span className="v2-accent">
                always in sight.
              </span>
            </h1>

            <p
              className="text-lg xl:text-xl leading-relaxed mb-8 max-w-lg text-fm-neutral-600"
            >
              The FreakingMinds Client Portal gives you full visibility into every campaign,
              deliverable, and metric — all in one place.
            </p>

            {/* Feature bullets */}
            <ul className="space-y-4">
              {portalFeatures.map((feature) => (
                <li key={feature.title} className="flex items-start gap-4">
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5"
                    style={{
                      background: 'rgba(201, 50, 93, 0.1)',
                      border: '1px solid rgba(201, 50, 93, 0.12)',
                    }}
                  >
                    <feature.icon className="w-5 h-5 text-fm-magenta-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-[0.9375rem] mb-0.5 text-fm-neutral-900">
                      {feature.title}
                    </p>
                    <p className="text-sm leading-relaxed text-fm-neutral-600">
                      {feature.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom: Brain mascot + trust signal */}
          <div className="flex items-end justify-between mt-8">
            {/* Trust / testimonial signal */}
            <div
              className="max-w-xs rounded-2xl px-5 py-4"
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                border: '1px solid rgba(201, 50, 93, 0.1)',
              }}
            >
              <p className="text-sm italic leading-relaxed text-fm-neutral-700">
                &ldquo;The portal changed how we collaborate. We always know exactly where things
                stand.&rdquo;
              </p>
              <p className="text-xs mt-2 font-medium" style={{ color: '#9a7888' }}>
                — Client, SaaS Startup
              </p>
            </div>

            {/* Brain mascot decoration */}
            <div className="relative flex-shrink-0 ml-6">
              <img
                src="/3dasset/brain-strategy.webp"
                alt=""
                role="presentation"
                loading="lazy"
                className="w-28 xl:w-36 h-auto animate-v2-hero-float"
                style={{ filter: 'drop-shadow(0 20px 40px rgba(140,25,60,0.25))' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/*  RIGHT PANEL - Login form                                          */}
      {/* ================================================================== */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 bg-white">
        {/* Mobile-only compact branded header */}
        <div
          className="lg:hidden px-6 pt-6 pb-8"
          style={{
            background: 'linear-gradient(135deg, #fef5f8 0%, #f5d0de 50%, #fce8ef 100%)',
          }}
        >
          <Link href="/">
            <Image
              src="/logo.png"
              alt="FreakingMinds"
              width={200}
              height={56}
              className="w-auto mb-4 hover:opacity-80 transition-opacity"
              style={{ height: '2.75rem' }}
              priority
            />
          </Link>
          <h1 className="font-display text-2xl font-bold text-fm-neutral-900">
            Client Portal
          </h1>
          <p className="text-sm mt-1 text-fm-neutral-600">
            Sign in to track your projects and campaigns.
          </p>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-12 lg:py-0">
          <div className="w-full max-w-[420px]">
            {/* Heading */}
            <div className="mb-8">
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-fm-neutral-900 mb-2">
                Welcome back
              </h2>
              <p className="text-fm-neutral-600 text-base">
                Sign in to your FreakingMinds client dashboard.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email field */}
              <Input
                id="email"
                type="email"
                label="Email Address"
                leftIcon={<Mail className="w-5 h-5" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />

              {/* Password field */}
              <Input
                id="password"
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                showPasswordToggle
                autoComplete="current-password"
                required
              />

              {/* Error message */}
              {error && (
                <div
                  key={errorKey}
                  className="flex items-center gap-2.5 text-sm rounded-xl px-4 py-3"
                  role="alert"
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                  }}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="v2-btn v2-btn-magenta v2-btn-full v2-btn-lg"
                style={{ marginTop: '2rem' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Credentials info box */}
            <div
              className="mt-6 rounded-xl px-5 py-4"
              style={{
                background: '#fef5f8',
                border: '1px solid rgba(201,50,93,0.12)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-4 h-4 text-fm-magenta-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-fm-neutral-900">
                  Need login credentials?
                </p>
              </div>
              <p className="text-sm text-fm-neutral-600 leading-relaxed">
                Contact your account manager or email us at{' '}
                <a
                  href="mailto:support@freakingminds.com"
                  className="font-medium underline underline-offset-2"
                  style={{ color: '#8c1d4a' }}
                >
                  support@freakingminds.com
                </a>{' '}
                for portal access.
              </p>
            </div>

            {/* Footer / copyright on mobile */}
            <p
              className="mt-10 text-xs lg:hidden"
              style={{ color: '#9a7888', textAlign: 'center' }}
            >
              &copy; {new Date().getFullYear()} FreakingMinds. All rights reserved.
            </p>
          </div>
        </div>

        {/* Desktop footer pinned to bottom */}
        <div className="hidden lg:block px-10 pb-6">
          <p className="text-xs" style={{ color: '#9a7888' }}>
            &copy; {new Date().getFullYear()} FreakingMinds. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
