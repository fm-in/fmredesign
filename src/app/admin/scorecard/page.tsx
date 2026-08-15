/**
 * Admin — marketing health scorecard submissions.
 *
 * Submissions are not leads (see migrations/2026-08-10-scorecard.sql). This
 * page is where someone decides one of them is, and converts it.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, ChevronDown, ChevronRight, UserPlus, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import type { DimensionResult } from '@/lib/scorecard/types';

interface Submission {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  overall_score: number;
  band: string;
  dimension_scores: DimensionResult[];
  status: string;
  lead_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  converted: number;
  averageScore: number;
  atRisk: number;
}

/** Mirrors the public report and the email — same meaning, same colours. */
const BAND: Record<string, { label: string; cls: string }> = {
  at_risk: { label: 'Needs attention', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  patchy: { label: 'Patchy', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  solid: { label: 'Solid', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  strong: { label: 'Strong', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function AdminScorecardPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/scorecard');
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setError(json?.error || 'Could not load submissions');
        return;
      }
      setSubmissions(json.data.submissions);
      setStats(json.data.stats);
    } catch {
      setError('Could not reach the server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function convert(id: string) {
    setConverting(id);
    try {
      const res = await fetch('/api/admin/scorecard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert', id }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setError(json?.error || 'Could not convert');
        return;
      }
      await load();
    } catch {
      setError('Could not reach the server');
    } finally {
      setConverting(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Scorecard"
        description="Marketing health scorecard submissions from the public site."
        icon={<ClipboardCheck className="w-6 h-6" />}
      />

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Submissions', value: stats.total },
            { label: 'Average score', value: `${stats.averageScore}/100` },
            { label: 'Needs attention', value: stats.atRisk },
            { label: 'Converted to leads', value: stats.converted },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-fm-neutral-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-fm-neutral-500 mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-fm-neutral-900">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-fm-neutral-500">Loading…</p>
      ) : submissions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-fm-neutral-300 p-10" style={{ textAlign: 'center' }}>
          <p className="text-fm-neutral-600 mb-1">No submissions yet.</p>
          <p className="text-sm text-fm-neutral-500">
            They appear here as soon as someone completes{' '}
            <Link href="/scorecard" className="text-fm-magenta-600 hover:underline">
              the scorecard
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-fm-neutral-200 bg-white overflow-hidden">
          {submissions.map((s) => {
            const band = BAND[s.band] || BAND.patchy;
            const open = expanded === s.id;
            return (
              <div key={s.id} className="border-b border-fm-neutral-100 last:border-b-0">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => setExpanded(open ? null : s.id)}
                    className="text-fm-neutral-400 hover:text-fm-neutral-700 shrink-0"
                    aria-label={open ? 'Collapse' : 'Expand'}
                  >
                    {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-fm-neutral-900 truncate">
                      {s.name}
                      {s.company ? (
                        <span className="text-fm-neutral-500 font-normal"> · {s.company}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-fm-neutral-500 truncate">
                      <a href={`mailto:${s.email}`} className="hover:text-fm-magenta-600">
                        {s.email}
                      </a>
                      {s.phone ? ` · ${s.phone}` : ''} ·{' '}
                      {new Date(s.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <span className={`shrink-0 text-xs px-2 py-1 rounded-full border ${band.cls}`}>
                    {band.label}
                  </span>
                  <span className="shrink-0 text-lg font-bold text-fm-neutral-900 w-12" style={{ textAlign: 'right' }}>
                    {s.overall_score}
                  </span>

                  {s.lead_id ? (
                    <Link
                      href="/admin/leads"
                      className="shrink-0 text-xs text-fm-neutral-500 hover:text-fm-magenta-600 inline-flex items-center gap-1"
                    >
                      Lead <ExternalLink className="w-3 h-3" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => convert(s.id)}
                      disabled={converting === s.id}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-fm-magenta-600 text-white hover:bg-fm-magenta-700 disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      <UserPlus className="w-3 h-3" />
                      {converting === s.id ? 'Converting…' : 'To lead'}
                    </button>
                  )}
                </div>

                {open && (
                  <div className="px-4 pb-4 pl-11 bg-fm-neutral-50/50">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(s.dimension_scores || []).map((d) => (
                        <div key={d.id} className="rounded-lg border border-fm-neutral-200 bg-white p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-fm-neutral-800">{d.label}</span>
                            <span className="text-sm font-bold text-fm-neutral-900">{d.score}</span>
                          </div>
                          <p className="text-xs text-fm-neutral-600 leading-relaxed">{d.recommendation}</p>
                        </div>
                      ))}
                    </div>
                    {(s.ip_address || s.user_agent) && (
                      <p className="mt-3 text-[11px] text-fm-neutral-400 break-all">
                        {s.ip_address} · {s.user_agent}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
