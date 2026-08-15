/**
 * Marketing health scorecard — shared types.
 *
 * Client-safe. The question set and scoring maths both run in the browser so
 * a visitor sees their result without a round-trip; the server re-scores the
 * same answers on submit and never trusts the client's arithmetic.
 */

/** Dimensions we diagnose. Order here is the order shown to the user. */
export type DimensionId =
  | 'foundation'
  | 'discoverability'
  | 'content'
  | 'paid'
  | 'measurement'
  | 'followup';

export interface AnswerOption {
  /** Stable identifier — persisted with the submission, so never renumber. */
  value: string;
  label: string;
  /** 0 (worst) to 3 (best). Every question uses the same range. */
  score: 0 | 1 | 2 | 3;
}

export interface Question {
  id: string;
  dimension: DimensionId;
  /** Phrased as something the owner can actually check, not jargon. */
  prompt: string;
  /** Optional clarifier shown under the prompt. */
  hint?: string;
  options: AnswerOption[];
}

export interface Dimension {
  id: DimensionId;
  label: string;
  /**
   * Relative importance in the overall score. Weights are deliberately not
   * all 1.0 — measurement and discoverability are where small businesses
   * lose the most and where a fix compounds fastest.
   */
  weight: number;
  /** One line explaining what this dimension covers, shown on the report. */
  description: string;
}

/** A visitor's answers: question id -> chosen option value. */
export type AnswerMap = Record<string, string>;

export type Band = 'at_risk' | 'patchy' | 'solid' | 'strong';

export interface DimensionResult {
  id: DimensionId;
  label: string;
  /** 0-100. */
  score: number;
  band: Band;
  /** Specific, actionable, and tied to the band actually achieved. */
  recommendation: string;
}

export interface ScorecardResult {
  /** 0-100, weighted across dimensions. */
  overall: number;
  band: Band;
  /** Always ordered worst-first so the report leads with what to fix. */
  dimensions: DimensionResult[];
  /** How many of the questions were answered. */
  answered: number;
  total: number;
}
