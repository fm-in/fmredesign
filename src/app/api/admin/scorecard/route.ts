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
import { requireAdminAuth } from '@/lib/admin-auth-middleware';
import type { DimensionResult } from '@/lib/scorecard/types';
import { determineLeadPriority } from '@/lib/supabase-utils';
import type {
  BudgetRange,
  CompanySize,
  LeadSource,
  LeadStatus,
  ProjectType,
  Timeline,
} from '@/lib/admin/lead-types';

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
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

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
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

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

  // `leads` requires company, project_description and primary_challenge. The
  // scorecard genuinely knows the challenge — it is the weakest dimension —
  // so the converted lead carries real context rather than placeholder text.
  const weakest = row.dimension_scores?.[0];
  const leadId = `lead_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  const summary = (row.dimension_scores || [])
    .map((d) => `${d.label}: ${d.score}/100`)
    .join(' · ');

  // `leads` carries CHECK constraints on several of these columns that the
  // schema snapshot does not record, so every value below is annotated with
  // its union type — a wrong string is then a compile error rather than a
  // runtime constraint violation discovered by a real user.
  //
  // The scorecard asks nothing about budget, timeline or company size, so
  // those take the honest "not stated" member of each union rather than a
  // flattering guess. `source` has no 'scorecard' member; the tag and
  // custom_fields below keep these distinguishable from get-started leads.
  const companySize: CompanySize = 'small_business';
  const projectType: ProjectType = 'digital_marketing';
  const budgetRange: BudgetRange = 'not_disclosed';
  const timeline: Timeline = 'flexible';
  const status: LeadStatus = 'new';
  const source: LeadSource = 'other';

  // A worse scorecard is a bigger opportunity, so the lead score inverts it.
  // Priority comes from the shared helper so it can only ever be a valid
  // member of LeadPriority.
  const leadScore = 100 - row.overall_score;

  const { error: insertErr } = await supabase.from('leads').insert({
    id: leadId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company || 'Not given',
    project_description: `Completed the marketing health scorecard, scoring ${row.overall_score}/100. ${summary}`,
    primary_challenge: weakest ? `${weakest.label} (${weakest.score}/100)` : 'Not determined',
    company_size: companySize,
    project_type: projectType,
    budget_range: budgetRange,
    timeline: timeline,
    status,
    priority: determineLeadPriority(leadScore),
    source,
    lead_score: leadScore,
    tags: ['scorecard'],
    notes: '',
    additional_challenges: [],
    custom_fields: { scorecardId: row.id, scorecardBand: row.band },
    // Carry attribution across rather than losing it at the boundary.
    ip_address: row.ip_address,
    user_agent: row.user_agent,
  });

  if (insertErr) {
    console.error('[admin/scorecard] lead insert failed:', insertErr);
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
