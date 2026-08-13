'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Loader2, AlertCircle, Sparkles } from 'lucide-react';

function TalentLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(searchParams.get('error') === 'session_expired' ? 'Session expired. Please log in again.' : '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/talent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (data.success && data.redirectUrl) {
        router.push(data.redirectUrl);
      } else {
        setError(data.error || 'Login failed. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-8" style={{ textAlign: 'center' }}>
        <div className="inline-flex items-center gap-2 mb-4">
          <Sparkles className="w-8 h-8 text-fm-magenta-600" />
          <span className="text-2xl font-bold text-white">CreativeMinds</span>
        </div>
        <p className="text-white/70">Sign in to your talent portal</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 space-y-6"
      >
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-fm-magenta-600 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-fm-magenta-600 focus:border-transparent"
              placeholder="Your password"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-fm-magenta-600 hover:bg-fm-magenta-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <p className="mt-6 text-white/50 text-sm" style={{ textAlign: 'center' }}>
        Part of the <a href="/" className="text-fm-magenta-400 hover:underline">FreakingMinds</a> network
      </p>
    </div>
  );
}

export default function TalentLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-fm-purple-700 via-[#2a1030] to-[#1a0a20] flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-fm-magenta-600" />
        </div>
      }>
        <TalentLoginForm />
      </Suspense>
    </div>
  );
}
