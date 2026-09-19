'use client';

import { useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function TalentSettingsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/talent/${slug}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Failed to change password.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 border border-fm-neutral-200 rounded-lg text-fm-neutral-900 focus:outline-none focus:ring-2 focus:ring-fm-magenta-600 focus:border-transparent';

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-fm-neutral-900">Settings</h1>
        <p className="text-fm-neutral-600 mt-1">Manage your portal account.</p>
      </div>

      <section className="rounded-site-md border border-fm-neutral-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="w-5 h-5 text-fm-magenta-600" />
          <h2 className="text-lg font-semibold text-fm-neutral-900">Change Password</h2>
        </div>

        {success && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Current Password</label>
            <input
              type="password"
              className={inputClass}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fm-neutral-700 mb-1">New Password</label>
            <input
              type="password"
              className={inputClass}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              className={inputClass}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-fm-magenta-600 hover:bg-fm-magenta-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Change Password
          </button>
        </form>
      </section>
    </div>
  );
}
