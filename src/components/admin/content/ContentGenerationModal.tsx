/**
 * AI Content Generation Modal
 * Multi-step dialog: select client → choose mode → configure → preview context → generate → review
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Calendar,
  FileText,
  Zap,
} from 'lucide-react';
import { DashboardButton } from '@/design-system';
import type { Platform, ContentType } from '@/lib/admin/project-types';

interface ContentGenerationModalProps {
  open: boolean;
  onClose: () => void;
  onGenerated: () => void;
  clients: Array<{ id: string; name: string }>;
}

type GenerationMode = 'monthly' | 'weekly' | 'single';
type Step = 'client' | 'mode' | 'configure' | 'context' | 'generating' | 'done';

interface ContextWarning {
  message: string;
}

export function ContentGenerationModal({
  open,
  onClose,
  onGenerated,
  clients,
}: ContentGenerationModalProps) {
  const [step, setStep] = useState<Step>('client');
  const [selectedClient, setSelectedClient] = useState('');
  const [mode, setMode] = useState<GenerationMode>('monthly');

  // Config state
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [platforms, setPlatforms] = useState<Platform[]>(['instagram']);
  const [postsPerWeek, setPostsPerWeek] = useState(5);
  const [singlePlatform, setSinglePlatform] = useState<Platform>('instagram');
  const [singleType, setSingleType] = useState<ContentType>('post');
  const [singleTopic, setSingleTopic] = useState('');
  const [singlePillar, setSinglePillar] = useState('');

  // Context preview state
  const [contextLoading, setContextLoading] = useState(false);
  const [contextWarnings, setContextWarnings] = useState<ContextWarning[]>([]);
  const [contextPillars, setContextPillars] = useState<Array<{ name: string }>>([]);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generatedBatchId, setGeneratedBatchId] = useState('');
  const [error, setError] = useState('');

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('client');
      setSelectedClient('');
      setMode('monthly');
      setError('');
      setGeneratedBatchId('');
    }
  }, [open]);

  const fetchContext = async () => {
    if (!selectedClient) return;
    setContextLoading(true);
    try {
      const res = await fetch(
        `/api/admin/content/context?clientId=${selectedClient}`
      );
      const data = await res.json();
      if (data.success) {
        setContextWarnings(
          (data.warnings || []).map((w: string) => ({ message: w }))
        );
        setContextPillars(data.data?.contentPillars || []);
      }
    } catch {
      // Non-critical
    } finally {
      setContextLoading(false);
    }
  };

  const handleGenerate = async () => {
    setStep('generating');
    setGenerating(true);
    setError('');

    try {
      const body: Record<string, unknown> = {
        mode,
        clientId: selectedClient,
        options: {},
      };

      if (mode === 'single') {
        (body.options as Record<string, unknown>).platform = singlePlatform;
        (body.options as Record<string, unknown>).type = singleType;
        if (singleTopic) (body.options as Record<string, unknown>).topic = singleTopic;
        if (singlePillar) (body.options as Record<string, unknown>).pillar = singlePillar;
      } else {
        (body.options as Record<string, unknown>).startDate = startDate;
        (body.options as Record<string, unknown>).platforms = platforms;
        (body.options as Record<string, unknown>).postsPerWeek = postsPerWeek;
      }

      const res = await fetch('/api/admin/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setGeneratedBatchId(data.batchId || '');
        setStep('done');
        // Refresh parent after a delay to allow Inngest to process
        setTimeout(() => onGenerated(), 5000);
      } else {
        setError(data.error || 'Generation failed');
        setStep('configure');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setStep('configure');
    } finally {
      setGenerating(false);
    }
  };

  if (!open) return null;

  const clientName = clients.find((c) => c.id === selectedClient)?.name || '';

  const allPlatforms: Platform[] = [
    'instagram',
    'facebook',
    'linkedin',
    'twitter',
    'youtube',
    'tiktok',
    'website',
  ];

  const allTypes: ContentType[] = [
    'post',
    'story',
    'reel',
    'carousel',
    'video',
    'article',
    'ad',
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4" style={{ zIndex: 50 }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-fm-neutral-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-fm-neutral-900">
                AI Content Generation
              </h2>
              <p className="text-sm text-fm-neutral-500">
                {step === 'client' && 'Select a client'}
                {step === 'mode' && 'Choose generation mode'}
                {step === 'configure' && 'Configure generation'}
                {step === 'context' && 'Review client context'}
                {step === 'generating' && 'Generating content...'}
                {step === 'done' && 'Generation queued'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-fm-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-fm-neutral-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Step 1: Select Client */}
          {step === 'client' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-fm-neutral-700">
                Select Client
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full rounded-lg border border-fm-neutral-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fm-magenta-500"
              >
                <option value="">Choose a client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Step 2: Choose Mode */}
          {step === 'mode' && (
            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  value: 'monthly' as GenerationMode,
                  icon: Calendar,
                  title: 'Monthly Calendar',
                  desc: 'Generate 30 days of content across all platforms',
                },
                {
                  value: 'weekly' as GenerationMode,
                  icon: FileText,
                  title: 'Weekly Calendar',
                  desc: '7 days of detailed, ready-to-post content',
                },
                {
                  value: 'single' as GenerationMode,
                  icon: Zap,
                  title: 'Single Post',
                  desc: 'One post with full caption, hashtags & visual direction',
                },
              ].map(({ value, icon: Icon, title, desc }) => (
                <button
                  key={value}
                  onClick={() => setMode(value)}
                  className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    mode === value
                      ? 'border-fm-magenta-500 bg-fm-magenta-50'
                      : 'border-fm-neutral-200 hover:border-fm-neutral-300'
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 mt-0.5 shrink-0 ${
                      mode === value
                        ? 'text-fm-magenta-600'
                        : 'text-fm-neutral-400'
                    }`}
                  />
                  <div>
                    <div className="font-medium text-fm-neutral-900">
                      {title}
                    </div>
                    <div className="text-sm text-fm-neutral-500">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Configure */}
          {step === 'configure' && (
            <div className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              {mode !== 'single' ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-fm-neutral-700">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-fm-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fm-magenta-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-fm-neutral-700">
                      Posts Per Week: {postsPerWeek}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={14}
                      value={postsPerWeek}
                      onChange={(e) =>
                        setPostsPerWeek(parseInt(e.target.value))
                      }
                      className="mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-fm-neutral-700 mb-2 block">
                      Platforms
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {allPlatforms.map((p) => (
                        <button
                          key={p}
                          onClick={() =>
                            setPlatforms((prev) =>
                              prev.includes(p)
                                ? prev.filter((x) => x !== p)
                                : [...prev, p]
                            )
                          }
                          className={`px-3 py-1.5 text-sm rounded-full border transition-colors capitalize ${
                            platforms.includes(p)
                              ? 'bg-fm-magenta-600 text-white border-fm-magenta-600'
                              : 'bg-white text-fm-neutral-600 border-fm-neutral-300 hover:border-fm-neutral-400'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-fm-neutral-700">
                      Platform
                    </label>
                    <select
                      value={singlePlatform}
                      onChange={(e) =>
                        setSinglePlatform(e.target.value as Platform)
                      }
                      className="mt-1 w-full rounded-lg border border-fm-neutral-300 px-3 py-2.5 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-fm-magenta-500"
                    >
                      {allPlatforms.map((p) => (
                        <option key={p} value={p} className="capitalize">
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-fm-neutral-700">
                      Content Type
                    </label>
                    <select
                      value={singleType}
                      onChange={(e) =>
                        setSingleType(e.target.value as ContentType)
                      }
                      className="mt-1 w-full rounded-lg border border-fm-neutral-300 px-3 py-2.5 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-fm-magenta-500"
                    >
                      {allTypes.map((t) => (
                        <option key={t} value={t} className="capitalize">
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-fm-neutral-700">
                      Topic / Brief (optional)
                    </label>
                    <textarea
                      value={singleTopic}
                      onChange={(e) => setSingleTopic(e.target.value)}
                      placeholder="e.g. Announce our new product launch..."
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-fm-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fm-magenta-500"
                    />
                  </div>
                  {contextPillars.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-fm-neutral-700">
                        Content Pillar (optional)
                      </label>
                      <select
                        value={singlePillar}
                        onChange={(e) => setSinglePillar(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-fm-neutral-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fm-magenta-500"
                      >
                        <option value="">Auto-select</option>
                        {contextPillars.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 4: Context Preview */}
          {step === 'context' && (
            <div className="space-y-3">
              <div className="text-sm text-fm-neutral-600">
                Generating content for{' '}
                <span className="font-semibold text-fm-neutral-900">
                  {clientName}
                </span>{' '}
                — {mode} mode
              </div>

              {contextLoading ? (
                <div className="flex items-center gap-2 py-8 justify-center text-fm-neutral-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading client context...
                </div>
              ) : (
                <>
                  {contextWarnings.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-yellow-700">
                        Data gaps (generation will still work):
                      </div>
                      {contextWarnings.map((w, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg"
                        >
                          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                          {w.message}
                        </div>
                      ))}
                    </div>
                  )}
                  {contextWarnings.length === 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      Client context looks complete — ready for high-quality
                      generation
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 5: Generating (queuing) */}
          {step === 'generating' && (
            <div className="flex flex-col items-center py-12 gap-4">
              <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
              </div>
              <div className="text-lg font-semibold text-fm-neutral-900">
                Queuing content generation...
              </div>
              <div className="text-sm text-fm-neutral-500">
                Setting up your {mode === 'single' ? 'post' : `${mode} calendar`} generation.
              </div>
            </div>
          )}

          {/* Step 6: Done (queued) */}
          {step === 'done' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-lg font-semibold text-fm-neutral-900">
                Content generation queued
              </div>
              <div className="text-sm text-fm-neutral-600 bg-blue-50 px-4 py-3 rounded-lg max-w-md border border-blue-200">
                <span className="font-medium text-blue-700">Processing in background</span>
                <span className="text-blue-600"> — the AI is generating your {mode === 'single' ? 'post' : `${mode} calendar`}. New drafts will appear in the content calendar shortly.</span>
              </div>
              {generatedBatchId && (
                <div className="text-xs text-fm-neutral-400 font-mono">
                  Batch: {generatedBatchId}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-fm-neutral-200">
          <div>
            {step !== 'client' &&
              step !== 'generating' &&
              step !== 'done' && (
                <DashboardButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const flow: Step[] = ['client', 'mode', 'configure', 'context'];
                    const idx = flow.indexOf(step);
                    if (idx > 0) setStep(flow[idx - 1]);
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </DashboardButton>
              )}
          </div>
          <div className="flex items-center gap-2">
            {step === 'done' ? (
              <DashboardButton variant="primary" size="sm" onClick={onClose}>
                Done
              </DashboardButton>
            ) : step === 'generating' ? null : step === 'context' ? (
              <DashboardButton
                variant="primary"
                size="sm"
                onClick={handleGenerate}
                disabled={generating}
              >
                <Sparkles className="w-4 h-4" />
                Generate
              </DashboardButton>
            ) : (
              <DashboardButton
                variant="primary"
                size="sm"
                disabled={
                  (step === 'client' && !selectedClient) ||
                  (step === 'configure' &&
                    mode !== 'single' &&
                    platforms.length === 0)
                }
                onClick={() => {
                  const flow: Step[] = ['client', 'mode', 'configure', 'context'];
                  const idx = flow.indexOf(step);
                  if (idx < flow.length - 1) {
                    const nextStep = flow[idx + 1];
                    setStep(nextStep);
                    if (nextStep === 'context') {
                      fetchContext();
                    }
                  }
                }}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </DashboardButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
