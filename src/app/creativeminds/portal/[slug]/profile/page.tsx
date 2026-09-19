'use client';

import { useState } from 'react';
import { useTalentPortal } from '@/lib/talent-portal/context';
import { Save, Loader2, CheckCircle } from 'lucide-react';

export default function TalentProfilePage() {
  const { profile, slug, refreshProfile } = useTalentPortal();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const personalInfo = (profile?.personalInfo || {}) as Record<string, unknown>;
  const portfolioLinks = (profile?.portfolioLinks || {}) as Record<string, unknown>;
  const socialMedia = (profile?.socialMedia || {}) as Record<string, unknown>;
  const availability = (profile?.availability || {}) as Record<string, unknown>;
  const pricing = (profile?.pricing || {}) as Record<string, unknown>;

  const [form, setForm] = useState({
    fullName: (personalInfo.fullName as string) || '',
    email: (personalInfo.email as string) || '',
    phone: (personalInfo.phone as string) || '',
    location: (personalInfo.location as string) || '',
    bio: (personalInfo.bio as string) || '',
    portfolioUrl: (portfolioLinks.portfolioUrl as string) || '',
    website: (portfolioLinks.website as string) || '',
    linkedin: (socialMedia.linkedin as string) || '',
    instagram: (socialMedia.instagram as string) || '',
    availabilityStatus: (availability.status as string) || 'available',
    hourlyRate: (pricing.hourlyRate as number) || 0,
  });

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const res = await fetch(`/api/talent/${slug}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalInfo: {
            ...(personalInfo),
            fullName: form.fullName,
            email: form.email,
            phone: form.phone,
            location: form.location,
            bio: form.bio,
          },
          portfolioLinks: {
            ...(portfolioLinks),
            portfolioUrl: form.portfolioUrl,
            website: form.website,
          },
          socialMedia: {
            ...(socialMedia),
            linkedin: form.linkedin,
            instagram: form.instagram,
          },
          availability: {
            ...(availability),
            status: form.availabilityStatus,
          },
          pricing: {
            ...(pricing),
            hourlyRate: form.hourlyRate,
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSaved(true);
        refreshProfile();
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 border border-fm-neutral-200 rounded-lg text-fm-neutral-900 focus:outline-none focus:ring-2 focus:ring-fm-magenta-600 focus:border-transparent';

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fm-neutral-900">Edit Profile</h1>
          <p className="text-fm-neutral-600 mt-1">Update your personal information and preferences.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-fm-magenta-600 hover:bg-fm-magenta-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Personal Info */}
      <section className="rounded-site-md border border-fm-neutral-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fm-neutral-900">Personal Information</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Full Name</label>
            <input className={inputClass} value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Email</label>
            <input type="email" className={inputClass} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Phone</label>
            <input className={inputClass} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Location</label>
            <input className={inputClass} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Bio</label>
          <textarea
            className={`${inputClass} min-h-[100px]`}
            value={form.bio}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
          />
        </div>
      </section>

      {/* Links */}
      <section className="rounded-site-md border border-fm-neutral-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fm-neutral-900">Links & Social</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Portfolio URL</label>
            <input className={inputClass} value={form.portfolioUrl} onChange={e => setForm(f => ({ ...f, portfolioUrl: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Website</label>
            <input className={inputClass} value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-fm-neutral-700 mb-1">LinkedIn</label>
            <input className={inputClass} value={form.linkedin} onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Instagram</label>
            <input className={inputClass} value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} />
          </div>
        </div>
      </section>

      {/* Availability & Pricing */}
      <section className="rounded-site-md border border-fm-neutral-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fm-neutral-900">Availability & Pricing</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Availability</label>
            <select
              className={inputClass}
              value={form.availabilityStatus}
              onChange={e => setForm(f => ({ ...f, availabilityStatus: e.target.value }))}
            >
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="not_available">Not Available</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Hourly Rate (INR)</label>
            <input
              type="number"
              className={inputClass}
              value={form.hourlyRate}
              onChange={e => setForm(f => ({ ...f, hourlyRate: Number(e.target.value) }))}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
