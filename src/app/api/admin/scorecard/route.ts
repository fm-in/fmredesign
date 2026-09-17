/**
 * Admin API for marketing health scorecard submissions.
 *
 * GET  — list submissions, newest first.
 * POST — { action: 'convert', id } promotes a submission into the `leads`
 *        table. Submissions are stored separately on purpose (see
 *        migrations/2026-08-10-scorecard.sql); this is the deliberate,
 *        human-triggered step that makes one a lead.
 */

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission } from '@/lib/admin-auth-middleware';
import type { DimensionResult } from '@/lib/scorecard/types';
import { ingestLead } from '@/lib/sales/intake/ingest';
import { IntakeError } from '@/lib/sales/errors';

export const dynamic = 'force-dynamic';

interface SubmissionRow {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  overall_score: number;
  band: string;
  dimension_scores: DimensionResult[];
  answers: Record<string, string>;
  status: string;
  lead_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'sales.read');
  if ('error' in auth) return auth.error;

  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);

  const { data, error } = await supabase
    .from('scorecard_submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[admin/scorecard] list failed:', error);
    return ApiResponse.error('Could not load submissions');
  }

  const rows = (data || []) as SubmissionRow[];

  // Cheap aggregate for the header — computed here so the page stays a thin
  // rendering layer rather than re-deriving totals in the browser.
  const stats = {
    total: rows.length,
    converted: rows.filter((r) => r.lead_id).length,
    averageScore: rows.length
      ? Math.round(rows.reduce((sum, r) => sum + r.overall_score, 0) / rows.length)
      : 0,
    atRisk: rows.filter((r) => r.band === 'at_risk').length,
  };

  return ApiResponse.success({ submissions: rows, stats });
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'sales.write');
  if ('error' in auth) return auth.error;

  let body: { action?: string; id?: string };
  try {
    body = await request.json();
  } catch {
    return ApiResponse.validationError('Invalid request');
  }

  if (body.action !== 'convert' || !body.id) {
    return ApiResponse.validationError('Expected { action: "convert", id }');
  }

  const supabase = getSupabaseAdmin();

  const { data: submission, error: fetchErr } = await supabase
    .from('scorecard_submissions')
    .select('*')
    .eq('id', body.id)
    .single();

  if (fetchErr || !submission) return ApiResponse.notFound('Submission not found');

  const row = submission as SubmissionRow;
  if (row.lead_id) {
    return ApiResponse.validationError('This submission has already been converted');
  }

  const weakest = row.dimension_scores?.[0];
  // dimension_scores is stored worst-first and each entry carries the advice the
  // person was shown for that dimension at its band (scoreScorecard). The
  // scorecard_fix email quotes the weakest one.
  const weakestFix = typeof weakest?.recommendation === 'string' ? weakest.recommendation.trim() : '';
  const summary = (row.dimension_scores || []).map((d) => `${d.label}: ${d.score}/100`).join(' · ');

  let leadId: string;
  try {
    ({ leadId } = await ingestLead({
      name: row.name,
      email: row.email,
      phone: row.phone ?? undefined,
      company: row.company ?? undefined,
      message: `Completed the marketing health scorecard, scoring ${row.overall_score}/100. ${summary}`,
      primaryChallenge: weakest ? `${weakest.label} (${weakest.score}/100)` : undefined,
      source: 'scorecard',
      sourceDetail: `Scorecard (${row.band})`,
      consent: { basis: 'inbound_request', evidence: { scorecardId: row.id }, capturedAt: row.created_at },
      customFields: {
        scorecardId: row.id,
        scorecardBand: row.band,
        scorecardScore: row.overall_score,
        ...(weakestFix ? { scorecardFix: weakestFix } : {}),
      },
      tags: ['scorecard'],
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
    }));
  } catch (err) {
    if (err instanceof IntakeError) return ApiResponse.validationError(err.message);
    console.error('[admin/scorecard] lead intake failed:', err);
    return ApiResponse.error('Could not create the lead');
  }

  const { error: linkErr } = await supabase
    .from('scorecard_submissions')
    .update({ lead_id: leadId, status: 'converted', updated_at: new Date().toISOString() })
    .eq('id', row.id);

  if (linkErr) {
    // The lead exists; only the backlink failed. Surface it rather than
    // pretending the whole thing worked, or the two can silently diverge.
    console.error('[admin/scorecard] backlink failed:', linkErr);
    return ApiResponse.error('Lead created, but linking it back to the submission failed');
  }

  return ApiResponse.success({ leadId });
}
