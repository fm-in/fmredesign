/**
 * Blog upload — drag-drop a .docx or .md file, post is parsed + AI-drafted
 * server-side, then we navigate to the editor to review and publish.
 */

'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileText, Loader2, Sparkles, AlertCircle, ArrowLeft, CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { adminToast } from '@/lib/admin/toast';

type Phase = 'idle' | 'uploading' | 'parsing' | 'success' | 'error';

export default function BlogUploadPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [aiAssist, setAiAssist] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setPhase('uploading');
    setError(null);
    setWarnings([]);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('aiAssist', aiAssist ? 'true' : 'false');

    try {
      setPhase('parsing');
      const res = await fetch('/api/admin/blog/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Upload failed');
        setPhase('error');
        return;
      }
      setWarnings(json.warnings || []);
      setPhase('success');
      adminToast.success(`Imported "${json.data.title}" as a draft`);
      // Send them straight to the editor so they can review immediately.
      router.push(`/admin/blog/${json.data.id}/edit?fresh=1`);
    } catch (e) {
      setError((e as Error).message);
      setPhase('error');
    }
  }, [aiAssist, router]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/markdown': ['.md', '.markdown'],
      'text/x-markdown': ['.md', '.markdown'],
    },
    disabled: phase === 'uploading' || phase === 'parsing',
  });

  const busy = phase === 'uploading' || phase === 'parsing';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload a post"
        description="Drop a Word document or Markdown file. The AI structures it into a publish-ready draft."
        icon={<Upload className="w-6 h-6" />}
        actions={
          <Link
            href="/admin/blog"
            className="inline-flex items-center gap-1.5 text-sm text-fm-neutral-600 hover:text-fm-neutral-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all posts
          </Link>
        }
      />

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`relative rounded-2xl border-2 border-dashed transition-all p-12 ${
            isDragActive
              ? 'border-fm-magenta-500 bg-fm-magenta-50'
              : busy
                ? 'border-fm-neutral-200 bg-fm-neutral-50 cursor-not-allowed'
                : 'border-fm-neutral-300 bg-white hover:border-fm-magenta-400 hover:bg-fm-magenta-50/30 cursor-pointer'
          }`}
          style={{ textAlign: 'center' }}
        >
          <input {...getInputProps()} />

          {busy ? (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 text-fm-magenta-600 mx-auto animate-spin" />
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-fm-neutral-900">
                  {phase === 'uploading' ? 'Uploading…' : 'Parsing & drafting…'}
                </h3>
                <p className="text-sm text-fm-neutral-600">
                  {phase === 'parsing'
                    ? aiAssist
                      ? 'The AI is reading your post and filling in the metadata.'
                      : 'Parsing your file…'
                    : 'Sending your file to the server.'}
                </p>
              </div>
            </div>
          ) : phase === 'success' ? (
            <div className="space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-lg font-semibold text-fm-neutral-900">Draft created — taking you to the editor</h3>
            </div>
          ) : (
            <div className="space-y-4">
              <FileText className="w-12 h-12 text-fm-magenta-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-fm-neutral-900">
                  {isDragActive ? 'Drop the file here' : 'Drop your .docx or .md file here'}
                </h3>
                <p className="text-sm text-fm-neutral-600">
                  …or click to choose. Max 15 MB.
                </p>
              </div>
              <div className="text-xs text-fm-neutral-500 flex items-center justify-center gap-3">
                <span className="px-2 py-0.5 rounded-full bg-fm-neutral-100">.docx</span>
                <span className="px-2 py-0.5 rounded-full bg-fm-neutral-100">.md</span>
              </div>
            </div>
          )}
        </div>

        {/* AI assist toggle */}
        <label className="flex items-start gap-3 p-4 bg-white border border-fm-neutral-200 rounded-xl cursor-pointer hover:bg-fm-neutral-50">
          <input
            type="checkbox"
            checked={aiAssist}
            onChange={(e) => setAiAssist(e.target.checked)}
            disabled={busy}
            className="mt-1 w-4 h-4 accent-fm-magenta-600"
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-fm-magenta-600" />
              <span className="font-medium text-fm-neutral-900">Let AI fill in the metadata</span>
            </div>
            <p className="text-sm text-fm-neutral-600">
              The AI will read your post and suggest a title, excerpt, slug, tags, category and SEO copy.
              You can edit everything before publishing.
            </p>
          </div>
        </label>

        {/* Error / warnings */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-red-900">Upload failed</div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-amber-900">Things to check in the editor</div>
              <ul className="text-sm text-amber-800 list-disc ml-5 space-y-0.5 mt-1">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          </div>
        )}

        {/* Format help */}
        <div className="bg-fm-neutral-50 border border-fm-neutral-200 rounded-xl p-5 text-sm text-fm-neutral-700 space-y-3">
          <h4 className="font-semibold text-fm-neutral-900">Tips for clean imports</h4>
          <ul className="space-y-1.5 list-disc ml-5">
            <li><strong>Word (.docx)</strong>: Use proper heading styles (H2, H3) so the AI can suggest a structure. Inline images get uploaded automatically.</li>
            <li><strong>Markdown (.md)</strong>: Add frontmatter for fine control:
              <pre className="text-xs bg-white border border-fm-neutral-200 rounded p-2 mt-1 overflow-x-auto">{`---
title: How to grow on Instagram in 2026
excerpt: A 5-minute primer on what works today.
cover_image: https://...
tags: [Social Media, Growth]
category: Social Media
---`}</pre>
            </li>
            <li>First H1 in the body is treated as the title if no frontmatter title is set.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
