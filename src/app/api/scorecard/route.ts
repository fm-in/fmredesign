/**
 * POST /api/scorecard — public marketing health scorecard submission.
 *
 * Follows the public-form contract in CLAUDE.md: rate limit, spam guard,
 * capture metadata, notify admins. See migrations/2026-08-10-scorecard.sql
 * for why submissions are kept out of the `leads` table.
 *
 * The client sends only answers. The score is derived here — a score posted
 * by the browser is ignored, so a submission cannot flatter itself into
 * looking like a qualified prospect.
 */

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase';
import { rateLimit, getClientIp } from '@/lib/rate-limiter';
import { captureMeta } from '@/lib/capture-meta';
import { checkSpam, HONEYPOT_FIELD } from '@/lib/spam-guard';
import { notifyAdmins } from '@/lib/notifications';
import { notifyRecipient, scorecardReportEmail } from '@/lib/email/send';
import { submitScorecardSchema, validateBody } from '@/lib/validations/schemas';
import { isComplete, scoreScorecard, BAND_LABELS } from '@/lib/scorecard/scoring';

/** Bumped whenever questions.ts changes in a way that alters scoring. */
const QUESTION_SET_VERSION = 'v1';

export async function POST(request: NextRequest) {
  if (!rateLimit(getClientIp(request), 3)) {
    return ApiResponse.error('Too many requests', 429);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return ApiResponse.validationError('Invalid request');
  }

  // Generic message on purpose — a bot should learn nothing from the rejection.
  const spam = checkSpam({
    honeypot: body[HONEYPOT_FIELD],
    email: typeof body.email === 'string' ? body.email : undefined,
    name: typeof body.name === 'string' ? body.name : undefined,
  });
  if (spam.isSpam) {
    return ApiResponse.validationError('A valid email is required');
  }

  const parsed = validateBody(submitScorecardSchema, body);
  if (!parsed.success) return ApiResponse.validationError(parsed.error);
  const input = parsed.data;

  if (!isComplete(input.answers)) {
    return ApiResponse.validationError('Please answer every question before submitting');
  }

  // Derived server-side from the answers, never taken from the request.
  const result = scoreScorecard(input.answers);

  const id = `sc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  const record = {
    id,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    company: input.company?.trim() || null,
    phone: input.phone?.trim() || null,
    answers: input.answers,
    overall_score: result.overall,
    band: result.band,
    dimension_scores: result.dimensions,
    question_set_version: QUESTION_SET_VERSION,
    status: 'new',
    ...captureMeta(request),
  };

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('scorecard_submissions').insert(record);

  if (error) {
    // The table is created by hand in the Supabase SQL editor, so the most
    // likely cause in practice is that the migration has not been run yet.
    console.error('[scorecard] insert failed:', error);
    return ApiResponse.error('Could not save your scorecard. Please try again.');
  }

  // The form promises "we will email you a copy" — honour it. Fire-and-forget:
  // sendEmail swallows its own failures, and a delivery problem must not fail a
  // submission the visitor has already completed.
  const report = scorecardReportEmail({
    name: record.name,
    overall: result.overall,
    bandLabel: BAND_LABELS[result.band],
    dimensions: result.dimensions.map((d) => ({
      label: d.label,
      score: d.score,
      band: d.band,
      recommendation: d.recommendation,
    })),
  });
  notifyRecipient(record.email, report.subject, report.html);

  // Email has silently failed before, so the dashboard is the source of truth.
  notifyAdmins({
    type: 'general',
    title: `Scorecard: ${record.company || record.name} scored ${result.overall}/100`,
    message: `${BAND_LABELS[result.band]}. Weakest area: ${result.dimensions[0]?.label}.`,
    priority: result.overall < 40 ? 'high' : 'normal',
    actionUrl: '/admin/scorecard',
  }).catch((err) => console.error('[scorecard] admin notify failed:', err));

  return ApiResponse.success({ id, result });
}
