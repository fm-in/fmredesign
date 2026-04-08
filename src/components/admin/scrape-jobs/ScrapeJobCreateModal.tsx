'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { DashboardButton } from '@/design-system';
import {
  SOURCE_PLATFORM_OPTIONS,
  SCHEDULE_TYPE_OPTIONS,
  GOOGLE_MAPS_COUNTRIES,
  GOOGLE_MAPS_MAX_RESULTS,
} from '@/lib/admin/scrape-job-types';
import type { ScrapeSourcePlatform, ScrapeScheduleType } from '@/lib/admin/scrape-job-types';

interface ScrapeJobCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    sourcePlatform: ScrapeSourcePlatform;
    params: Record<string, unknown>;
    scheduleType: ScrapeScheduleType;
  }) => Promise<void>;
}

export function ScrapeJobCreateModal({ isOpen, onClose, onCreate }: ScrapeJobCreateModalProps) {
  const [name, setName] = useState('');
  const [sourcePlatform, setSourcePlatform] = useState<ScrapeSourcePlatform>('bni');
  const [scheduleType, setScheduleType] = useState<ScrapeScheduleType>('manual');
  const [submitting, setSubmitting] = useState(false);

  // BNI params
  const [bniCountry, setBniCountry] = useState('India');
  const [bniCategoryId, setBniCategoryId] = useState('');

  // Google Maps params
  const [gmQuery, setGmQuery] = useState('');
  const [gmLocation, setGmLocation] = useState('');
  const [gmCountry, setGmCountry] = useState('India');
  const [gmCountryCustom, setGmCountryCustom] = useState('');
  const [gmMaxPages, setGmMaxPages] = useState(1);
  const [queryWarning, setQueryWarning] = useState('');
  const [locationWarning, setLocationWarning] = useState('');

  // Warn on instruction-like queries
  useEffect(() => {
    const instructionWords = /\b(only|best|top|most|just|first|cheapest|expensive)\b/i;
    if (gmQuery && instructionWords.test(gmQuery)) {
      setQueryWarning('Tip: Use a simple search term (e.g., "restaurants"). Avoid instructions like "only 30" — the API doesn\'t understand them.');
    } else {
      setQueryWarning('');
    }
  }, [gmQuery]);

  // Warn on multi-city location
  useEffect(() => {
    if (gmLocation && gmLocation.includes(',')) {
      setLocationWarning('Enter one city per job. Use the Rotation tab for multi-city scraping.');
    } else {
      setLocationWarning('');
    }
  }, [gmLocation]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      let params: Record<string, unknown> = {};
      if (sourcePlatform === 'bni') {
        params = { country: bniCountry };
        if (bniCategoryId) params.category_id = parseInt(bniCategoryId, 10);
      } else if (sourcePlatform === 'google_maps') {
        if (!gmQuery.trim() || !gmLocation.trim()) return;
        const country = gmCountry === 'Other' ? gmCountryCustom.trim() : gmCountry;
        params = {
          query: gmQuery.trim(),
          location: gmLocation.trim(),
          country: country || 'India',
          max_pages: gmMaxPages,
        };
      }

      await onCreate({ name, sourcePlatform, params, scheduleType });
      // Reset form
      setName('');
      setBniCountry('India');
      setBniCategoryId('');
      setGmQuery('');
      setGmLocation('');
      setGmCountry('India');
      setGmCountryCustom('');
      setGmMaxPages(1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4" style={{ zIndex: 50 }}>
      <div className="bg-white border border-fm-neutral-200 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-fm-neutral-200">
          <h2 className="text-lg font-semibold text-fm-neutral-900">Create Scrape Job</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-fm-neutral-400 hover:text-fm-neutral-700 hover:bg-fm-neutral-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-fm-neutral-600 mb-1.5">Job Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., BNI Philippines Food & Beverage"
              className="w-full px-3 py-2 rounded-lg bg-white border border-fm-neutral-200 text-fm-neutral-900 placeholder-fm-neutral-400 text-sm focus:outline-none focus:border-fm-magenta-600"
              required
            />
          </div>

          {/* Source Platform */}
          <div>
            <label className="block text-sm font-medium text-fm-neutral-600 mb-1.5">Source Platform</label>
            <div className="grid grid-cols-2 gap-2">
              {SOURCE_PLATFORM_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => !opt.disabled && setSourcePlatform(opt.value)}
                  disabled={opt.disabled}
                  className={`px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                    opt.disabled
                      ? 'border-fm-neutral-100 bg-fm-neutral-50 text-fm-neutral-300 cursor-not-allowed'
                      : sourcePlatform === opt.value
                        ? 'border-fm-magenta-600 bg-fm-magenta-50 text-fm-neutral-900'
                        : 'border-fm-neutral-200 bg-white text-fm-neutral-600 hover:bg-fm-neutral-50'
                  }`}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-xs text-fm-neutral-400 mt-0.5">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Params */}
          {sourcePlatform === 'bni' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-fm-neutral-600 mb-1.5">Country</label>
                <input
                  type="text"
                  value={bniCountry}
                  onChange={(e) => setBniCountry(e.target.value)}
                  placeholder="India"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-fm-neutral-200 text-fm-neutral-900 placeholder-fm-neutral-400 text-sm focus:outline-none focus:border-fm-magenta-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fm-neutral-600 mb-1.5">
                  Category ID <span className="text-fm-neutral-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={bniCategoryId}
                  onChange={(e) => setBniCategoryId(e.target.value)}
                  placeholder="e.g., 56"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-fm-neutral-200 text-fm-neutral-900 placeholder-fm-neutral-400 text-sm focus:outline-none focus:border-fm-magenta-600"
                />
              </div>
            </div>
          )}

          {sourcePlatform === 'google_maps' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-fm-neutral-600 mb-1.5">Search Query</label>
                <input
                  type="text"
                  value={gmQuery}
                  onChange={(e) => setGmQuery(e.target.value)}
                  placeholder="e.g., luxury restaurants, web development agencies"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-fm-neutral-200 text-fm-neutral-900 placeholder-fm-neutral-400 text-sm focus:outline-none focus:border-fm-magenta-600"
                  required
                />
                {queryWarning && (
                  <div className="flex items-start gap-1.5 mt-1.5 text-xs text-amber-600">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{queryWarning}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-fm-neutral-600 mb-1.5">City / Area</label>
                <input
                  type="text"
                  value={gmLocation}
                  onChange={(e) => setGmLocation(e.target.value)}
                  placeholder="e.g., Mumbai"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-fm-neutral-200 text-fm-neutral-900 placeholder-fm-neutral-400 text-sm focus:outline-none focus:border-fm-magenta-600"
                  required
                />
                {locationWarning && (
                  <div className="flex items-start gap-1.5 mt-1.5 text-xs text-amber-600">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{locationWarning}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-fm-neutral-600 mb-1.5">Country</label>
                <select
                  value={gmCountry}
                  onChange={(e) => setGmCountry(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-fm-neutral-200 text-fm-neutral-900 text-sm focus:outline-none focus:border-fm-magenta-600"
                >
                  {GOOGLE_MAPS_COUNTRIES.map((c) => (
                    <option key={c} value={c} className="bg-white">{c}</option>
                  ))}
                  <option value="Other" className="bg-white">Other</option>
                </select>
                {gmCountry === 'Other' && (
                  <input
                    type="text"
                    value={gmCountryCustom}
                    onChange={(e) => setGmCountryCustom(e.target.value)}
                    placeholder="Enter country name"
                    className="w-full mt-2 px-3 py-2 rounded-lg bg-white border border-fm-neutral-200 text-fm-neutral-900 placeholder-fm-neutral-400 text-sm focus:outline-none focus:border-fm-magenta-600"
                    required
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-fm-neutral-600 mb-1.5">Max Results</label>
                <select
                  value={gmMaxPages}
                  onChange={(e) => setGmMaxPages(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-fm-neutral-200 text-fm-neutral-900 text-sm focus:outline-none focus:border-fm-magenta-600"
                >
                  {GOOGLE_MAPS_MAX_RESULTS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-white">{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {sourcePlatform === 'linkedin' && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-sm text-yellow-700">
                LinkedIn scraping is not yet implemented. You can create the job definition now and it will be ready when support is added.
              </p>
            </div>
          )}

          {/* Schedule Type */}
          <div>
            <label className="block text-sm font-medium text-fm-neutral-600 mb-1.5">Schedule</label>
            <select
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value as ScrapeScheduleType)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-fm-neutral-200 text-fm-neutral-900 text-sm focus:outline-none focus:border-fm-magenta-600"
            >
              {SCHEDULE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <DashboardButton variant="secondary" size="sm" onClick={onClose} type="button">
              Cancel
            </DashboardButton>
            <DashboardButton
              variant="primary"
              size="sm"
              type="submit"
              disabled={
                submitting ||
                !name.trim() ||
                (sourcePlatform === 'google_maps' && (!gmQuery.trim() || !gmLocation.trim()))
              }
            >
              {submitting ? 'Creating...' : 'Create Job'}
            </DashboardButton>
          </div>
        </form>
      </div>
    </div>
  );
}
