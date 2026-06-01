/**
 * Content Strategy Tab
 * Manages content pillars, events, preferences, and competitor URLs for a client.
 * Saves to the clients table via PUT /api/clients.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  Target,
  CalendarDays,
  Settings,
  Globe,
} from 'lucide-react';
import { DashboardButton, DashboardCard, CardContent } from '@/design-system';
import { adminToast } from '@/lib/admin/toast';
import type { ContentPillar, ContentEvent, ContentPreferences } from '@/lib/ai/context/types';

interface ContentStrategyTabProps {
  clientId: string;
}

export function ContentStrategyTab({ clientId }: ContentStrategyTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data
  const [pillars, setPillars] = useState<ContentPillar[]>([]);
  const [events, setEvents] = useState<ContentEvent[]>([]);
  const [preferences, setPreferences] = useState<ContentPreferences>({
    defaultPlatforms: ['instagram'],
    postsPerWeek: 5,
    preferredContentTypes: ['post', 'carousel', 'reel'],
    hashtagStrategy: 'moderate',
    includeEmojis: true,
    captionLength: 'medium',
    ctaStyle: '',
  });
  const [competitorUrls, setCompetitorUrls] = useState<string[]>([]);

  // Load data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients?id=${clientId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setPillars(data.data.contentPillars || []);
        setEvents(data.data.contentEvents || []);
        if (data.data.contentPreferences) {
          setPreferences(data.data.contentPreferences);
        }
        setCompetitorUrls(data.data.competitorSocialUrls || []);
      }
    } catch {
      adminToast.error('Failed to load strategy data');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Save all
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: clientId,
          contentPillars: pillars,
          contentEvents: events,
          contentPreferences: preferences,
          competitorSocialUrls: competitorUrls,
        }),
      });
      const data = await res.json();
      if (data.success) {
        adminToast.success('Content strategy saved');
      } else {
        adminToast.error(data.error || 'Failed to save');
      }
    } catch {
      adminToast.error('Failed to save strategy');
    } finally {
      setSaving(false);
    }
  };

  // Pillar helpers
  const addPillar = () => {
    setPillars([
      ...pillars,
      { name: '', description: '', percentage: 0, hashtags: [] },
    ]);
  };

  const updatePillar = (
    index: number,
    field: keyof ContentPillar,
    value: string | number | string[]
  ) => {
    const updated = [...pillars];
    updated[index] = { ...updated[index], [field]: value };
    setPillars(updated);
  };

  const removePillar = (index: number) => {
    setPillars(pillars.filter((_, i) => i !== index));
  };

  // Event helpers
  const addEvent = () => {
    setEvents([
      ...events,
      {
        name: '',
        date: new Date().toISOString().split('T')[0],
        type: 'custom',
      },
    ]);
  };

  const updateEvent = (
    index: number,
    field: keyof ContentEvent,
    value: string
  ) => {
    const updated = [...events];
    updated[index] = { ...updated[index], [field]: value };
    setEvents(updated);
  };

  const removeEvent = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  // Competitor URL helpers
  const addCompetitorUrl = () => setCompetitorUrls([...competitorUrls, '']);
  const updateCompetitorUrl = (index: number, value: string) => {
    const updated = [...competitorUrls];
    updated[index] = value;
    setCompetitorUrls(updated);
  };
  const removeCompetitorUrl = (index: number) => {
    setCompetitorUrls(competitorUrls.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-fm-neutral-400" />
      </div>
    );
  }

  const totalPercentage = pillars.reduce((sum, p) => sum + (p.percentage || 0), 0);

  const allPlatforms = [
    'instagram',
    'facebook',
    'linkedin',
    'twitter',
    'youtube',
    'tiktok',
    'website',
  ];

  const allContentTypes = [
    'post',
    'story',
    'reel',
    'carousel',
    'video',
    'article',
    'ad',
    'email',
  ];

  return (
    <div className="space-y-6">
      {/* Save button at top */}
      <div className="flex justify-end">
        <DashboardButton
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Strategy
        </DashboardButton>
      </div>

      {/* Content Pillars */}
      <DashboardCard variant="admin">
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-fm-magenta-600" />
              <h3 className="text-lg font-semibold text-fm-neutral-900">
                Content Pillars
              </h3>
              {totalPercentage > 0 && (
                <span
                  className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                    totalPercentage === 100
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {totalPercentage}%
                </span>
              )}
            </div>
            <DashboardButton variant="secondary" size="sm" onClick={addPillar}>
              <Plus className="w-4 h-4" />
              Add Pillar
            </DashboardButton>
          </div>

          {pillars.length === 0 ? (
            <p className="text-sm text-fm-neutral-500 py-4">
              No content pillars defined. Add pillars to guide AI content
              distribution.
            </p>
          ) : (
            <div className="space-y-3">
              {pillars.map((pillar, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg bg-fm-neutral-50"
                >
                  <input
                    type="text"
                    value={pillar.name}
                    onChange={(e) => updatePillar(i, 'name', e.target.value)}
                    placeholder="Pillar name"
                    className="flex-1 rounded-md border border-fm-neutral-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-fm-magenta-500"
                  />
                  <input
                    type="text"
                    value={pillar.description}
                    onChange={(e) =>
                      updatePillar(i, 'description', e.target.value)
                    }
                    placeholder="Description"
                    className="flex-[2] rounded-md border border-fm-neutral-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-fm-magenta-500"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={pillar.percentage}
                      onChange={(e) =>
                        updatePillar(i, 'percentage', parseInt(e.target.value) || 0)
                      }
                      style={{ textAlign: 'center' }}
                      className="w-16 rounded-md border border-fm-neutral-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-fm-magenta-500"
                    />
                    <span className="text-sm text-fm-neutral-500">%</span>
                  </div>
                  <button
                    onClick={() => removePillar(i)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors self-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </DashboardCard>

      {/* Upcoming Events */}
      <DashboardCard variant="admin">
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-fm-magenta-600" />
              <h3 className="text-lg font-semibold text-fm-neutral-900">
                Custom Events
              </h3>
            </div>
            <DashboardButton variant="secondary" size="sm" onClick={addEvent}>
              <Plus className="w-4 h-4" />
              Add Event
            </DashboardButton>
          </div>

          {events.length === 0 ? (
            <p className="text-sm text-fm-neutral-500 py-4">
              No custom events. India holidays and industry events are included
              automatically.
            </p>
          ) : (
            <div className="space-y-3">
              {events.map((event, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg bg-fm-neutral-50"
                >
                  <input
                    type="text"
                    value={event.name}
                    onChange={(e) => updateEvent(i, 'name', e.target.value)}
                    placeholder="Event name"
                    className="flex-1 rounded-md border border-fm-neutral-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-fm-magenta-500"
                  />
                  <input
                    type="date"
                    value={event.date}
                    onChange={(e) => updateEvent(i, 'date', e.target.value)}
                    className="rounded-md border border-fm-neutral-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-fm-magenta-500"
                  />
                  <select
                    value={event.type}
                    onChange={(e) => updateEvent(i, 'type', e.target.value)}
                    className="rounded-md border border-fm-neutral-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-fm-magenta-500"
                  >
                    <option value="holiday">Holiday</option>
                    <option value="product_launch">Product Launch</option>
                    <option value="campaign">Campaign</option>
                    <option value="industry_event">Industry Event</option>
                    <option value="custom">Custom</option>
                  </select>
                  <button
                    onClick={() => removeEvent(i)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors self-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </DashboardCard>

      {/* Content Preferences */}
      <DashboardCard variant="admin">
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-fm-magenta-600" />
            <h3 className="text-lg font-semibold text-fm-neutral-900">
              Content Preferences
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Default Platforms */}
            <div>
              <label className="text-sm font-medium text-fm-neutral-700 mb-2 block">
                Default Platforms
              </label>
              <div className="flex flex-wrap gap-2">
                {allPlatforms.map((p) => (
                  <button
                    key={p}
                    onClick={() =>
                      setPreferences((prev) => ({
                        ...prev,
                        defaultPlatforms: prev.defaultPlatforms.includes(p)
                          ? prev.defaultPlatforms.filter((x) => x !== p)
                          : [...prev.defaultPlatforms, p],
                      }))
                    }
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors capitalize ${
                      preferences.defaultPlatforms.includes(p)
                        ? 'bg-fm-magenta-600 text-white border-fm-magenta-600'
                        : 'bg-white text-fm-neutral-600 border-fm-neutral-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Types */}
            <div>
              <label className="text-sm font-medium text-fm-neutral-700 mb-2 block">
                Preferred Content Types
              </label>
              <div className="flex flex-wrap gap-2">
                {allContentTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() =>
                      setPreferences((prev) => ({
                        ...prev,
                        preferredContentTypes:
                          prev.preferredContentTypes.includes(t)
                            ? prev.preferredContentTypes.filter((x) => x !== t)
                            : [...prev.preferredContentTypes, t],
                      }))
                    }
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors capitalize ${
                      preferences.preferredContentTypes.includes(t)
                        ? 'bg-fm-magenta-600 text-white border-fm-magenta-600'
                        : 'bg-white text-fm-neutral-600 border-fm-neutral-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Posts per week */}
            <div>
              <label className="text-sm font-medium text-fm-neutral-700">
                Posts Per Week: {preferences.postsPerWeek}
              </label>
              <input
                type="range"
                min={1}
                max={21}
                value={preferences.postsPerWeek}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    postsPerWeek: parseInt(e.target.value),
                  }))
                }
                className="mt-1 w-full"
              />
            </div>

            {/* Hashtag Strategy */}
            <div>
              <label className="text-sm font-medium text-fm-neutral-700">
                Hashtag Strategy
              </label>
              <select
                value={preferences.hashtagStrategy}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    hashtagStrategy: e.target.value as ContentPreferences['hashtagStrategy'],
                  }))
                }
                className="mt-1 w-full rounded-md border border-fm-neutral-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-fm-magenta-500"
              >
                <option value="minimal">Minimal (3-5)</option>
                <option value="moderate">Moderate (10-15)</option>
                <option value="aggressive">Aggressive (20-30)</option>
              </select>
            </div>

            {/* Caption Length */}
            <div>
              <label className="text-sm font-medium text-fm-neutral-700">
                Caption Length
              </label>
              <select
                value={preferences.captionLength}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    captionLength: e.target.value as ContentPreferences['captionLength'],
                  }))
                }
                className="mt-1 w-full rounded-md border border-fm-neutral-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-fm-magenta-500"
              >
                <option value="short">Short (1-2 lines)</option>
                <option value="medium">Medium (3-5 lines)</option>
                <option value="long">Long (6+ lines)</option>
              </select>
            </div>

            {/* Emojis toggle */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-fm-neutral-700">
                Include Emojis
              </label>
              <button
                onClick={() =>
                  setPreferences((prev) => ({
                    ...prev,
                    includeEmojis: !prev.includeEmojis,
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.includeEmojis
                    ? 'bg-fm-magenta-600'
                    : 'bg-fm-neutral-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.includeEmojis ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* CTA Style */}
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-fm-neutral-700">
                Default CTA Style
              </label>
              <input
                type="text"
                value={preferences.ctaStyle || ''}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    ctaStyle: e.target.value,
                  }))
                }
                placeholder="e.g. Link in bio, DM us, Visit website"
                className="mt-1 w-full rounded-md border border-fm-neutral-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-fm-magenta-500"
              />
            </div>
          </div>
        </CardContent>
      </DashboardCard>

      {/* Competitor URLs */}
      <DashboardCard variant="admin">
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-fm-magenta-600" />
              <h3 className="text-lg font-semibold text-fm-neutral-900">
                Competitor Social URLs
              </h3>
            </div>
            <DashboardButton
              variant="secondary"
              size="sm"
              onClick={addCompetitorUrl}
            >
              <Plus className="w-4 h-4" />
              Add URL
            </DashboardButton>
          </div>

          {competitorUrls.length === 0 ? (
            <p className="text-sm text-fm-neutral-500 py-4">
              No competitor URLs. Add social profiles for future reference.
            </p>
          ) : (
            <div className="space-y-2">
              {competitorUrls.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateCompetitorUrl(i, e.target.value)}
                    placeholder="https://instagram.com/competitor"
                    className="flex-1 rounded-md border border-fm-neutral-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-fm-magenta-500"
                  />
                  <button
                    onClick={() => removeCompetitorUrl(i)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </DashboardCard>
    </div>
  );
}
