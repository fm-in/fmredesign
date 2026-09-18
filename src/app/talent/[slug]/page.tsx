/**
 * Talent Profile Page
 * Lightweight "My Profile" for approved CreativeMinds talent.
 * Slug-based access (no login) — similar to client portal.
 */

'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { V2PageWrapper } from '@/components/layouts/V2PageWrapper';
import {
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Globe,
  Clock,
  Star,
  Save,
  Loader2,
  CheckCircle,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Edit3,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import {
  TALENT_CATEGORIES,
  EXPERIENCE_LEVELS,
  CURRENCIES,
  PROJECT_COMMITMENT_OPTIONS,
  type TalentCategory,
} from '@/lib/admin/talent-types';

/* ─── JSONB-honest type — no fake deep shapes ─── */
type TalentProfile = Record<string, any>;

type EditSection = 'contact' | 'availability' | 'portfolio' | 'pricing' | null;

/* ─── Helpers ─── */

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Format a rate value that may be a flat number or {min, max} object */
function formatRate(value: any, symbol: string): string | null {
  if (value == null) return null;

  if (typeof value === 'number') {
    return value > 0 ? `${symbol}${value.toLocaleString('en-IN')}` : null;
  }

  if (typeof value === 'object') {
    const min = Number(value.min) || 0;
    const max = Number(value.max) || 0;
    if (min > 0 && max > 0 && min !== max) {
      return `${symbol}${min.toLocaleString('en-IN')}\u2013${symbol}${max.toLocaleString('en-IN')}`;
    }
    if (min > 0) return `${symbol}${min.toLocaleString('en-IN')}`;
    if (max > 0) return `${symbol}${max.toLocaleString('en-IN')}`;
    return null;
  }

  const num = Number(value);
  return num > 0 ? `${symbol}${num.toLocaleString('en-IN')}` : null;
}

/* ─── ProfileAvatar ─── */

function ProfileAvatar({ name, src }: { name: string; src?: string }) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(name);

  if (src && !imgError) {
    return (
      <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 ring-2 ring-fm-magenta-600/30">
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="w-16 h-16 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-xl ring-2 ring-fm-magenta-600/30"
      style={{ background: 'linear-gradient(135deg, #c9325d, #e8543e)' }}
    >
      {initials}
    </div>
  );
}

/* ─── Main Component ─── */

export default function TalentProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<EditSection>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable drafts
  const [draftContact, setDraftContact] = useState<Record<string, any> | null>(null);
  const [draftAvailability, setDraftAvailability] = useState<Record<string, any> | null>(null);
  const [draftPortfolio, setDraftPortfolio] = useState<Record<string, any> | null>(null);
  const [draftPricing, setDraftPricing] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    fetch(`/api/talent/${slug}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setProfile(result.profile);
        } else {
          setError(result.error || 'Profile not found');
        }
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [slug]);

  const startEditing = (section: EditSection) => {
    if (!profile) return;
    const p = profile as Record<string, any>;

    if (section === 'contact') {
      setDraftContact({ ...(p.personalInfo || {}) });
    }

    if (section === 'availability') {
      const raw = { ...(p.availability || {}) };
      // Normalize status/currentStatus duality
      const statusValue = raw.currentStatus || raw.status || 'available';
      raw.currentStatus = statusValue;
      raw.status = statusValue;
      raw.remoteWork = raw.remoteWork ?? false;
      setDraftAvailability(raw);
    }

    if (section === 'portfolio') {
      setDraftPortfolio({ ...(p.portfolioLinks || {}) });
    }

    if (section === 'pricing') {
      const raw = { ...(p.pricing || {}) };
      // Copy currency from preferences if missing from pricing
      if (!raw.currency) {
        raw.currency = (p.preferences || {}).currency || 'INR';
      }
      setDraftPricing(raw);
    }

    setEditing(section);
    setSaveSuccess(false);
  };

  const cancelEditing = () => {
    setEditing(null);
    setDraftContact(null);
    setDraftAvailability(null);
    setDraftPortfolio(null);
    setDraftPricing(null);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setSaveSuccess(false);

    const body: Record<string, any> = {};
    if (editing === 'contact' && draftContact) body.personalInfo = draftContact;
    if (editing === 'availability' && draftAvailability) body.availability = draftAvailability;
    if (editing === 'portfolio' && draftPortfolio) body.portfolioLinks = draftPortfolio;
    if (editing === 'pricing' && draftPricing) body.pricing = draftPricing;

    try {
      const res = await fetch(`/api/talent/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.success) {
        // Merge updates into profile
        setProfile((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            ...(editing === 'contact' && draftContact ? { personalInfo: draftContact } : {}),
            ...(editing === 'availability' && draftAvailability ? { availability: draftAvailability } : {}),
            ...(editing === 'portfolio' && draftPortfolio ? { portfolioLinks: draftPortfolio } : {}),
            ...(editing === 'pricing' && draftPricing ? { pricing: draftPricing } : {}),
          };
        });
        setSaveSuccess(true);
        setTimeout(() => {
          setEditing(null);
          setSaveSuccess(false);
        }, 1500);
      } else {
        alert('Failed to save: ' + (result.error || 'Unknown error'));
      }
    } catch {
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <V2PageWrapper>
        <section className="relative z-10 v2-section v2-section--hero v2-section--outro">
          <div className="v2-container flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-fm-magenta-600" />
          </div>
        </section>
      </V2PageWrapper>
    );
  }

  // Error / not found
  if (error || !profile) {
    return (
      <V2PageWrapper>
        <section className="relative z-10 v2-section v2-section--hero v2-section--outro">
          <div className="v2-container">
            <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-2xl p-10" style={{ textAlign: 'center' }}>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <X className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-fm-neutral-900 mb-3">Profile Not Found</h1>
              <p className="text-fm-neutral-600 mb-6">
                This profile link may be invalid or the account may have been deactivated.
              </p>
              <Link href="/creativeminds" className="v2-btn v2-btn-magenta">
                Visit CreativeMinds
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </V2PageWrapper>
    );
  }

  const pi = (profile.personalInfo || {}) as Record<string, any>;
  const pd = (profile.professionalDetails || {}) as Record<string, any>;
  const av = (profile.availability || {}) as Record<string, any>;
  const pr = (profile.pricing || {}) as Record<string, any>;
  const pl = (profile.portfolioLinks || {}) as Record<string, any>;
  const prefs = (profile.preferences || {}) as Record<string, any>;
  const categoryKey = pd.category || pd.primaryCategory || '';
  const categoryLabel = TALENT_CATEGORIES[categoryKey as TalentCategory]?.label || categoryKey || 'Creative';
  const experienceLabel = EXPERIENCE_LEVELS.find((e) => e.value === pd.experienceLevel)?.label || pd.experienceLevel || '';
  const currencySymbol = CURRENCIES.find((c) => c.code === (prefs.currency || pr?.currency))?.symbol || '\u20B9';
  const currentStatus = av.currentStatus || av.status || 'available';
  const commitmentLabel = PROJECT_COMMITMENT_OPTIONS.find((o) => o.value === av.projectCommitment)?.label || av.projectCommitment || 'Both';
  const subcategories: string[] = Array.isArray(pd.subcategories) ? pd.subcategories : [];
  const skills: string[] = Array.isArray(pd.skills) ? pd.skills.map((s: any) => typeof s === 'string' ? s : s?.name || '') : [];
  const tools: string[] = Array.isArray(pd.tools) ? pd.tools : [];
  const languages: string[] = Array.isArray(pi.languages) ? pi.languages : [];
  const location = pi.location || {};
  const workSampleUrls: string[] = Array.isArray(pl.workSampleUrls) ? pl.workSampleUrls : [];

  // Pricing display values
  const hourlyDisplay = formatRate(pr.hourlyRate, currencySymbol);
  const projectDisplay = formatRate(pr.projectRate, currencySymbol);
  const retainerDisplay = formatRate(pr.retainerRate, currencySymbol);
  const hasAnyRate = hourlyDisplay || projectDisplay || retainerDisplay;

  const statusColors: Record<string, string> = {
    available: 'bg-green-100 text-green-800',
    partially_available: 'bg-yellow-100 text-yellow-800',
    busy: 'bg-red-100 text-red-800',
    unavailable: 'bg-gray-100 text-gray-600',
  };

  const inputClass =
    'w-full px-3 py-2 border border-fm-neutral-300 rounded-lg focus:ring-2 focus:ring-fm-magenta-500 focus:border-fm-magenta-500 text-sm';

  return (
    <V2PageWrapper>
      <section className="relative z-10 v2-section v2-section--hero v2-section--outro">
        <div className="v2-container">
          {/* Header */}
          <div className="max-w-4xl mx-auto" style={{ marginBottom: '40px' }}>
            <div className="v2-badge v2-badge-glass mb-6">
              <Sparkles className="w-4 h-4 v2-text-primary" />
              <span className="v2-text-primary">CreativeMinds Profile</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <ProfileAvatar name={pi.fullName || ''} src={pi.profilePicture} />
                <div>
                  <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold v2-text-primary leading-tight mb-1">
                    {pi.fullName}
                  </h1>
                  <p className="text-lg v2-text-secondary">
                    {categoryLabel} &middot; {experienceLabel}
                  </p>
                </div>
              </div>
              <div
                className={`shrink-0 whitespace-nowrap self-start inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium ${statusColors[currentStatus] || 'bg-gray-100 text-gray-600'}`}
              >
                <div className={`w-2 h-2 rounded-full ${currentStatus === 'available' ? 'bg-green-500' : currentStatus === 'partially_available' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <span className="sm:hidden">
                  {currentStatus === 'available' ? 'Available' : currentStatus === 'partially_available' ? 'Partial' : 'Busy'}
                </span>
                <span className="hidden sm:inline">
                  {currentStatus === 'available' ? 'Available' : currentStatus === 'partially_available' ? 'Partially Available' : 'Busy'}
                </span>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN — 2/3 */}
            <div className="lg:col-span-2 space-y-6">
              {/* Bio */}
              <div className="v2-paper rounded-2xl p-6 md:p-8">
                <h2 className="text-lg font-bold text-fm-neutral-900 mb-3">About</h2>
                <p className="text-fm-neutral-600 leading-relaxed">{pi.bio}</p>
              </div>

              {/* Skills & Tools (read-only, set by admin) */}
              <div className="v2-paper rounded-2xl p-6 md:p-8">
                <h2 className="text-lg font-bold text-fm-neutral-900 mb-4">Skills & Tools</h2>
                {subcategories.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-fm-neutral-500 uppercase tracking-wide mb-2">Specializations</p>
                    <div className="flex flex-wrap gap-2">
                      {subcategories.map((sub) => (
                        <span key={sub} className="px-3 py-1 bg-fm-magenta-50 text-fm-magenta-700 rounded-full text-sm font-medium">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {skills.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-fm-neutral-500 uppercase tracking-wide mb-2">Core Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((s) => (
                        <span key={s} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {tools.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-fm-neutral-500 uppercase tracking-wide mb-2">Tools</p>
                    <div className="flex flex-wrap gap-2">
                      {tools.map((t) => (
                        <span key={t} className="px-3 py-1 bg-fm-neutral-100 text-fm-neutral-700 rounded-full text-sm">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Portfolio Links — editable */}
              <div className="v2-paper rounded-2xl p-6 md:p-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-fm-neutral-900">Portfolio</h2>
                  {editing !== 'portfolio' && (
                    <button onClick={() => startEditing('portfolio')} className="text-fm-magenta-600 hover:text-fm-magenta-700 text-sm font-medium flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                </div>

                {editing === 'portfolio' && draftPortfolio ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Portfolio Website</label>
                      <input
                        type="url"
                        value={draftPortfolio.websiteUrl || ''}
                        onChange={(e) => setDraftPortfolio({ ...draftPortfolio, websiteUrl: e.target.value })}
                        className={inputClass}
                        placeholder="https://yourportfolio.com"
                      />
                    </div>
                    {(draftPortfolio.workSampleUrls || []).map((url: string, i: number) => (
                      <div key={i}>
                        <label className="block text-sm font-medium text-fm-neutral-700 mb-1">Work Sample {i + 1}</label>
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => {
                            const urls = [...(draftPortfolio.workSampleUrls || [])];
                            urls[i] = e.target.value;
                            setDraftPortfolio({ ...draftPortfolio, workSampleUrls: urls });
                          }}
                          className={inputClass}
                          placeholder="https://..."
                        />
                      </div>
                    ))}
                    <EditActions saving={saving} saveSuccess={saveSuccess} onSave={handleSave} onCancel={cancelEditing} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pl.websiteUrl && (
                      <a href={pl.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-fm-magenta-600 hover:underline text-sm">
                        <Globe className="w-4 h-4" /> {pl.websiteUrl}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {workSampleUrls.filter(Boolean).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-fm-neutral-600 hover:text-fm-magenta-600 text-sm">
                        <ExternalLink className="w-3.5 h-3.5" /> Work Sample {i + 1}
                      </a>
                    ))}
                    {!pl.websiteUrl && !workSampleUrls.filter(Boolean).length && (
                      <p className="text-fm-neutral-400 text-sm">No portfolio links added yet</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN — 1/3 sidebar */}
            <div className="space-y-6">
              {/* Contact Info — editable */}
              <div className="v2-paper rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-fm-neutral-900">Contact</h2>
                  {editing !== 'contact' && (
                    <button onClick={() => startEditing('contact')} className="text-fm-magenta-600 hover:text-fm-magenta-700 text-sm font-medium flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                </div>

                {editing === 'contact' && draftContact ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-fm-neutral-600 mb-1">Email</label>
                      <input
                        type="email"
                        value={draftContact.email || ''}
                        onChange={(e) => setDraftContact({ ...draftContact, email: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-fm-neutral-600 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={draftContact.phone || ''}
                        onChange={(e) => setDraftContact({ ...draftContact, phone: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-fm-neutral-600 mb-1">City</label>
                      <input
                        type="text"
                        value={draftContact.location?.city || ''}
                        onChange={(e) => setDraftContact({ ...draftContact, location: { ...(draftContact.location || {}), city: e.target.value } })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-fm-neutral-600 mb-1">Bio</label>
                      <textarea
                        value={draftContact.bio || ''}
                        onChange={(e) => setDraftContact({ ...draftContact, bio: e.target.value })}
                        rows={3}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-fm-neutral-600 mb-1">Profile Picture URL</label>
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-fm-neutral-400 shrink-0" />
                        <input
                          type="url"
                          value={draftContact.profilePicture || ''}
                          onChange={(e) => setDraftContact({ ...draftContact, profilePicture: e.target.value })}
                          className={inputClass}
                          placeholder="https://example.com/photo.jpg"
                        />
                      </div>
                      <p className="text-xs text-fm-neutral-400 mt-1">Paste a URL to your profile photo</p>
                    </div>
                    <EditActions saving={saving} saveSuccess={saveSuccess} onSave={handleSave} onCancel={cancelEditing} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <InfoRow icon={<Mail className="w-4 h-4" />} label={pi.email} />
                    <InfoRow icon={<Phone className="w-4 h-4" />} label={pi.phone} />
                    <InfoRow icon={<MapPin className="w-4 h-4" />} label={`${location.city || ''}, ${location.state || ''}`} />
                    {languages.length > 0 && (
                      <InfoRow icon={<Globe className="w-4 h-4" />} label={languages.join(', ')} />
                    )}
                  </div>
                )}
              </div>

              {/* Availability — editable */}
              <div className="v2-paper rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-fm-neutral-900">Availability</h2>
                  {editing !== 'availability' && (
                    <button onClick={() => startEditing('availability')} className="text-fm-magenta-600 hover:text-fm-magenta-700 text-sm font-medium flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                </div>

                {editing === 'availability' && draftAvailability ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-fm-neutral-600 mb-1">Status</label>
                      <select
                        value={draftAvailability.currentStatus || draftAvailability.status || 'available'}
                        onChange={(e) => setDraftAvailability({ ...draftAvailability, currentStatus: e.target.value, status: e.target.value })}
                        className={inputClass}
                      >
                        <option value="available">Available</option>
                        <option value="partially_available">Partially Available</option>
                        <option value="busy">Busy</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-fm-neutral-600 mb-1">Hours / Week</label>
                      <input
                        type="number"
                        min={0}
                        max={80}
                        value={draftAvailability.hoursPerWeek || 0}
                        onChange={(e) => setDraftAvailability({ ...draftAvailability, hoursPerWeek: parseInt(e.target.value) || 0 })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-fm-neutral-600 mb-1">Commitment</label>
                      <select
                        value={draftAvailability.projectCommitment || 'both'}
                        onChange={(e) => setDraftAvailability({ ...draftAvailability, projectCommitment: e.target.value })}
                        className={inputClass}
                      >
                        {PROJECT_COMMITMENT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="remote"
                        checked={draftAvailability.remoteWork || false}
                        onChange={(e) => setDraftAvailability({ ...draftAvailability, remoteWork: e.target.checked })}
                        className="rounded"
                      />
                      <label htmlFor="remote" className="text-sm text-fm-neutral-700">Remote work</label>
                    </div>
                    <EditActions saving={saving} saveSuccess={saveSuccess} onSave={handleSave} onCancel={cancelEditing} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <InfoRow icon={<Clock className="w-4 h-4" />} label={`${av.hoursPerWeek || 0} hrs/week`} />
                    <InfoRow icon={<Briefcase className="w-4 h-4" />} label={commitmentLabel} />
                    {av.remoteWork && <InfoRow icon={<Globe className="w-4 h-4" />} label="Remote available" />}
                  </div>
                )}
              </div>

              {/* Pricing — editable */}
              <div className="v2-paper rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-fm-neutral-900">Rates</h2>
                  {editing !== 'pricing' && (
                    <button onClick={() => startEditing('pricing')} className="text-fm-magenta-600 hover:text-fm-magenta-700 text-sm font-medium flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                </div>

                {editing === 'pricing' && draftPricing ? (
                  <div className="space-y-3">
                    <SmartRateInput
                      label="Hourly"
                      symbol={currencySymbol}
                      value={draftPricing.hourlyRate}
                      onChange={(v) => setDraftPricing({ ...draftPricing, hourlyRate: v })}
                    />
                    <SmartRateInput
                      label="Per-project"
                      symbol={currencySymbol}
                      value={draftPricing.projectRate}
                      onChange={(v) => setDraftPricing({ ...draftPricing, projectRate: v })}
                    />
                    <SmartRateInput
                      label="Monthly"
                      symbol={currencySymbol}
                      value={draftPricing.retainerRate}
                      onChange={(v) => setDraftPricing({ ...draftPricing, retainerRate: v })}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="negotiable"
                        checked={draftPricing.openToNegotiation || false}
                        onChange={(e) => setDraftPricing({ ...draftPricing, openToNegotiation: e.target.checked })}
                        className="rounded"
                      />
                      <label htmlFor="negotiable" className="text-sm text-fm-neutral-700">Open to negotiation</label>
                    </div>
                    <EditActions saving={saving} saveSuccess={saveSuccess} onSave={handleSave} onCancel={cancelEditing} />
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {hourlyDisplay && (
                      <div className="flex justify-between text-fm-neutral-600">
                        <span>Hourly</span>
                        <span className="font-medium text-fm-neutral-900">{hourlyDisplay}</span>
                      </div>
                    )}
                    {projectDisplay && (
                      <div className="flex justify-between text-fm-neutral-600">
                        <span>Per-project</span>
                        <span className="font-medium text-fm-neutral-900">{projectDisplay}</span>
                      </div>
                    )}
                    {retainerDisplay && (
                      <div className="flex justify-between text-fm-neutral-600">
                        <span>Monthly</span>
                        <span className="font-medium text-fm-neutral-900">{retainerDisplay}</span>
                      </div>
                    )}
                    {!hasAnyRate && (
                      <p className="text-fm-neutral-400 text-sm">No rates set</p>
                    )}
                    {pr.openToNegotiation && (
                      <p className="text-xs text-fm-neutral-400 pt-1">Open to negotiation</p>
                    )}
                  </div>
                )}
              </div>

              {/* Ratings */}
              {(profile as any).ratings?.totalReviews > 0 && (
                <div className="v2-paper rounded-2xl p-6">
                  <h2 className="text-base font-bold text-fm-neutral-900 mb-3">Ratings</h2>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-xl font-bold text-fm-neutral-900">{Number((profile as any).ratings?.overallRating || 0).toFixed(1)}</span>
                    <span className="text-sm text-fm-neutral-500">({(profile as any).ratings?.totalReviews} reviews)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </V2PageWrapper>
  );
}

/* ─── Small helper components ─── */

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-fm-neutral-600">
      <span className="text-fm-neutral-400">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

/** Smart rate input that handles flat numbers and {min, max} objects */
function SmartRateInput({
  label,
  symbol,
  value,
  onChange,
}: {
  label: string;
  symbol: string;
  value: any;
  onChange: (v: any) => void;
}) {
  const isRange = typeof value === 'object' && value !== null && ('min' in value || 'max' in value);
  const [showRange, setShowRange] = useState(isRange && (Number(value?.max) > 0));

  const inputCls = 'w-full px-2 py-1.5 border border-fm-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-fm-magenta-500';

  if (showRange) {
    const min = isRange ? (Number(value?.min) || 0) : (Number(value) || 0);
    const max = isRange ? (Number(value?.max) || 0) : 0;
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-fm-neutral-600">{label} ({symbol})</label>
          <button
            type="button"
            onClick={() => {
              setShowRange(false);
              onChange(min || max || 0);
            }}
            className="text-xs text-fm-magenta-600 hover:underline"
          >
            Single rate
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={min || ''}
            onChange={(e) => onChange({ min: parseInt(e.target.value) || 0, max })}
            className={inputCls}
            placeholder="Min"
          />
          <input
            type="number"
            value={max || ''}
            onChange={(e) => onChange({ min, max: parseInt(e.target.value) || 0 })}
            className={inputCls}
            placeholder="Max"
          />
        </div>
      </div>
    );
  }

  const flat = isRange ? (Number(value?.min) || Number(value?.max) || 0) : (Number(value) || 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-fm-neutral-600">{label} ({symbol})</label>
        <button
          type="button"
          onClick={() => {
            setShowRange(true);
            onChange({ min: flat, max: 0 });
          }}
          className="text-xs text-fm-magenta-600 hover:underline"
        >
          Add range
        </button>
      </div>
      <input
        type="number"
        value={flat || ''}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className={inputCls}
        placeholder="Rate"
      />
    </div>
  );
}

function EditActions({
  saving,
  saveSuccess,
  onSave,
  onCancel,
}: {
  saving: boolean;
  saveSuccess: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-1.5 px-4 py-2 bg-fm-magenta-600 text-white text-sm font-medium rounded-lg hover:bg-fm-magenta-700 transition-colors disabled:opacity-60"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveSuccess ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
        {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save'}
      </button>
      {!saving && !saveSuccess && (
        <button onClick={onCancel} className="px-3 py-2 text-sm text-fm-neutral-600 hover:text-fm-neutral-800">
          Cancel
        </button>
      )}
    </div>
  );
}
