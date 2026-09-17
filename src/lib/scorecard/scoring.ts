/**
 * Marketing health scorecard — scoring.
 *
 * Pure functions with no I/O, so the browser can show a live result and the
 * server can recompute the identical score from the same answers. The server
 * NEVER trusts a score sent by the client; it stores only the answers and
 * derives everything from them here.
 */

import { DIMENSIONS, QUESTIONS, RECOMMENDATIONS } from './questions';
import type {
  AnswerMap,
  Band,
  DimensionId,
  DimensionResult,
  ScorecardResult,
} from './types';

/** Highest score any single question can contribute. */
const MAX_PER_QUESTION = 3;

/**
 * Band thresholds, as a lower bound on the 0-100 score.
 *
 * The bottom band starts at 40 rather than 25 deliberately: a business
 * scoring 30 is not "a quarter of the way there", it has a real problem, and
 * a scorecard that flatters everyone is worthless as a diagnosis.
 */
const BANDS: ReadonlyArray<{ min: number; band: Band }> = [
  { min: 80, band: 'strong' },
  { min: 60, band: 'solid' },
  { min: 40, band: 'patchy' },
  { min: 0, band: 'at_risk' },
];

export function bandFor(score: number): Band {
  return BANDS.find((b) => score >= b.min)?.band ?? 'at_risk';
}

/** Human label for a band. */
export const BAND_LABELS: Record<Band, string> = {
  at_risk: 'Needs attention',
  patchy: 'Patchy',
  solid: 'Solid',
  strong: 'Strong',
};

/**
 * Resolve one answer to its score.
 *
 * Returns null when the question is unanswered OR the submitted value is not
 * one this question offers. Treating an unrecognised value as "unanswered"
 * rather than as zero means a stale or tampered payload cannot silently
 * manufacture a bad score for someone.
 */
function scoreForAnswer(questionId: string, answers: AnswerMap): number | null {
  const question = QUESTIONS.find((q) => q.id === questionId);
  if (!question) return null;
  const chosen = answers[questionId];
  if (typeof chosen !== 'string') return null;
  const option = question.options.find((o) => o.value === chosen);
  return option ? option.score : null;
}

/**
 * Score a single dimension as a 0-100 percentage.
 *
 * Unanswered questions are excluded from BOTH the numerator and denominator,
 * so a partially completed scorecard still reads sensibly while the user is
 * filling it in. Completeness is enforced before a report is issued — see
 * `isComplete` — precisely because this exclusion would otherwise let someone
 * skip the questions they score badly on.
 */
export function scoreDimension(
  dimensionId: DimensionId,
  answers: AnswerMap
): { score: number; answered: number; total: number } {
  const questions = QUESTIONS.filter((q) => q.dimension === dimensionId);
  let raw = 0;
  let answered = 0;

  for (const q of questions) {
    const s = scoreForAnswer(q.id, answers);
    if (s === null) continue;
    raw += s;
    answered += 1;
  }

  const max = answered * MAX_PER_QUESTION;
  return {
    score: max === 0 ? 0 : Math.round((raw / max) * 100),
    answered,
    total: questions.length,
  };
}

/** True when every question has a recognised answer. */
export function isComplete(answers: AnswerMap): boolean {
  return QUESTIONS.every((q) => scoreForAnswer(q.id, answers) !== null);
}

/**
 * Score the whole scorecard.
 *
 * Dimensions with no answers are left out of the weighted average entirely
 * rather than counted as zero — an unanswered section is unknown, not bad.
 */
export function scoreScorecard(answers: AnswerMap): ScorecardResult {
  const results: DimensionResult[] = [];
  let weightedTotal = 0;
  let weightUsed = 0;
  let answered = 0;

  for (const dimension of DIMENSIONS) {
    const { score, answered: got } = scoreDimension(dimension.id, answers);
    answered += got;

    if (got > 0) {
      weightedTotal += score * dimension.weight;
      weightUsed += dimension.weight;
    }

    const band = bandFor(score);
    results.push({
      id: dimension.id,
      label: dimension.label,
      score,
      band,
      recommendation: RECOMMENDATIONS[dimension.id]?.[band] ?? '',
    });
  }

  const overall = weightUsed === 0 ? 0 : Math.round(weightedTotal / weightUsed);

  return {
    overall,
    band: bandFor(overall),
    // Worst first: the report should open with what is actually costing them,
    // not with whatever happens to be listed first.
    dimensions: results.sort((a, b) => a.score - b.score),
    answered,
    total: QUESTIONS.length,
  };
}
