/**
 * Admin Login Page
 * Multi-level authentication (Password + Mobile)
 * Split-panel design matching client portal
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Lock,
  Shield,
  Phone,
  AlertCircle,
  Loader2,
  ArrowRight,
  Users,
  BarChart3,
  Settings,
  Zap,
} from 'lucide-react';
import { useAdminAuth } from '@/lib/admin/auth';
import { Input } from '@/components/ui/Input';

/* -------------------------------------------------------------------------- */
/*  Feature bullet data                                                        */
/* -------------------------------------------------------------------------- */
const adminFeatures = [
  {
    icon: Users,
    title: 'Team & Client Management',
    description: 'Manage team members, assign projects, and track client relationships.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    description: 'Real-time dashboards with campaign performance and revenue insights.',
  },
  {
    icon: Zap,
    title: 'Project Workflows',
    description: 'Streamlined project pipelines from brief to delivery.',
  },
  {
    icon: Settings,
    title: 'Full System Control',
    description: 'Configure services, manage content, and oversee all operations.',
  },
];

export default function AdminLoginPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, login, loginWithMobile } = useAdminAuth();
  const [authMethod, setAuthMethod] = useState<'password' | 'mobile'>('mobile');
  const [password, setPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/admin');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let success = false;

      if (authMethod === 'password') {
        if (!password.trim()) {
          setError('Please enter your password');
          setIsLoading(false);
          return;
        }
        success = await login(password);
        if (!success) {
          setError('Invalid password. Please try again.');
          setPassword('');
        }
      } else {
        if (!mobileNumber.trim()) {
          setError('Please enter your mobile number');
          setIsLoading(false);
          return;
        }
        const result = await loginWithMobile(mobileNumber);
        success = result.success;
        if (!success) {
          setError(result.error || 'Mobile authentication failed. Please try again.');
          setMobileNumber('');
        }
      }

      if (success) {
        router.push('/admin');
      }
    } catch {
      setError('Authentication failed. Please try again.');
    }

    setIsLoading(false);
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
              #f5f0f8 0%,
              #ece4f0 10%,
              #e3d8e8 20%,
              #dacce0 30%,
              #d3c3da 40%,
              #cfbdd6 50%,
              #d3c3da 60%,
              #dacce0 70%,
              #e3d8e8 80%,
              #ece4f0 90%,
              #f5f0f8 100%
            )
          `,
        }}
      >
        {/* Decorative gradient orbs */}
        <div
          className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(74, 25, 66, 0.18) 0%, transparent 50%)',
            top: '-10%',
            right: '-10%',
            zIndex: 0,
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(140, 29, 74, 0.15) 0%, transparent 50%)',
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
            background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 0%, rgba(74, 25, 66, 0.08) 100%)',
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

            <h1 className="font-display text-4xl xl:text-5xl font-bold leading-tight mb-6 text-fm-neutral-900">
              Command center,{' '}
              <span className="v2-accent">
                fully loaded.
              </span>
            </h1>

            <p className="text-lg xl:text-xl leading-relaxed mb-8 max-w-lg text-fm-neutral-600">
              The FreakingMinds Admin Dashboard gives you complete control over clients,
              projects, team, and analytics — all from one place.
            </p>

            {/* Feature bullets */}
            <ul className="space-y-4">
              {adminFeatures.map((feature) => (
                <li key={feature.title} className="flex items-start gap-4">
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5"
                    style={{
                      background: 'rgba(74, 25, 66, 0.1)',
                      border: '1px solid rgba(74, 25, 66, 0.12)',
                    }}
                  >
                    <feature.icon className="w-5 h-5 text-fm-magenta-700" />
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

          {/* Bottom: Brain mascot + tagline */}
          <div className="flex items-end justify-between mt-8">
            <div
              className="max-w-xs rounded-2xl px-5 py-4"
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                border: '1px solid rgba(74, 25, 66, 0.1)',
              }}
            >
              <p className="text-sm italic leading-relaxed text-fm-neutral-700">
                &ldquo;Everything you need to run the agency — zero tab-switching required.&rdquo;
              </p>
              <p className="text-xs mt-2 font-medium" style={{ color: '#7a5878' }}>
                — FreakingMinds Team
              </p>
            </div>

            {/* Brain mascot */}
            <div className="relative flex-shrink-0 ml-6">
              <img
                src="/3dasset/brain-teaching.webp"
                alt=""
                role="presentation"
                loading="lazy"
                className="w-28 xl:w-36 h-auto animate-v2-hero-float"
                style={{ filter: 'drop-shadow(0 20px 40px rgba(74,25,66,0.25))' }}
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
            background: 'linear-gradient(135deg, #f5f0f8 0%, #dacce0 50%, #ece4f0 100%)',
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
            Admin Dashboard
          </h1>
          <p className="text-sm mt-1 text-fm-neutral-600">
            Sign in to manage your agency operations.
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
                Sign in to the FreakingMinds admin dashboard.
              </p>
            </div>

            {/* Auth method toggle */}
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('mobile');
                  setError('');
                  setPassword('');
                  setMobileNumber('');
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: authMethod === 'mobile' ? 'rgba(74, 25, 66, 0.08)' : 'transparent',
                  border: authMethod === 'mobile' ? '1.5px solid rgba(74, 25, 66, 0.2)' : '1.5px solid rgba(0,0,0,0.08)',
                  color: authMethod === 'mobile' ? '#4a1942' : '#525251',
                }}
              >
                <Phone className="w-4 h-4" />
                Mobile
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('password');
                  setError('');
                  setPassword('');
                  setMobileNumber('');
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: authMethod === 'password' ? 'rgba(74, 25, 66, 0.08)' : 'transparent',
                  border: authMethod === 'password' ? '1.5px solid rgba(74, 25, 66, 0.2)' : '1.5px solid rgba(0,0,0,0.08)',
                  color: authMethod === 'password' ? '#4a1942' : '#525251',
                }}
              >
                <Lock className="w-4 h-4" />
                Password
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {authMethod === 'mobile' ? (
                <Input
                  id="mobile"
                  type="tel"
                  label="Mobile Number"
                  leftIcon={<Phone className="w-5 h-5" />}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                  hint="Enter your authorized mobile number"
                  required
                />
              ) : (
                <Input
                  id="password"
                  type="password"
                  label="Admin Password"
                  leftIcon={<Lock className="w-5 h-5" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  showPasswordToggle
                  autoComplete="current-password"
                  hint="Super admin password for full system access"
                  required
                />
              )}

              {/* Error message */}
              {error && (
                <div
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
                disabled={isLoading}
                className="v2-btn v2-btn-magenta v2-btn-full v2-btn-lg"
                style={{ marginTop: '2rem' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Info box */}
            <div
              className="mt-6 rounded-xl px-5 py-4"
              style={{
                background: '#f5f0f8',
                border: '1px solid rgba(74, 25, 66, 0.12)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-fm-magenta-700 flex-shrink-0" />
                <p className="text-sm font-semibold text-fm-neutral-900">
                  Authorized access only
                </p>
              </div>
              <p className="text-sm text-fm-neutral-600 leading-relaxed">
                {authMethod === 'password'
                  ? 'Super admin access for FreakingMinds system administrators only.'
                  : 'Mobile authentication for authorized FreakingMinds team members.'}
              </p>
            </div>

            {/* Footer / copyright on mobile */}
            <p
              className="mt-10 text-xs lg:hidden"
              style={{ color: '#7a5878', textAlign: 'center' }}
            >
              &copy; {new Date().getFullYear()} FreakingMinds. All rights reserved.
            </p>
          </div>
        </div>

        {/* Desktop footer pinned to bottom */}
        <div className="hidden lg:block px-10 pb-6">
          <p className="text-xs" style={{ color: '#7a5878' }}>
            &copy; {new Date().getFullYear()} FreakingMinds. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
