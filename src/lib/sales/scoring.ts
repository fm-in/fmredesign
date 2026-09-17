/**
 * Lead score = 60% fit (the existing weighted model) + intent points by
 * source, capped at 100. Intent matters most: someone who booked a call is
 * worth more than a perfect profile who only filled a form.
 */

import { calculateLeadScore, determineLeadPriority } from '@/lib/supabase-utils';
import type { BudgetRange, CompanySize, LeadPriority, Timeline } from '@/lib/admin/lead-types';

export interface ScoreInput {
  source: string;
  budgetRange?: string;
  timeline?: string;
  companySize?: string;
  industry?: string;
  primaryChallenge?: string;
  customFields?: Record<string, unknown>;
}

export const NEUTRAL_FIT_SCORE = 50;
export const AD_FORM_BUDGET_BONUS = 10;

export const INTENT_POINTS: Readonly<Record<string, number>> = {
  cal_booking: 40,
  website_form: 20,
  scorecard: 15,
  meta_lead_ads: 15,
  google_lead_form: 15,
  connector: 10,
};

const AD_FORM_SOURCES = new Set(['meta_lead_ads', 'google_lead_form']);

const BUDGETS: readonly BudgetRange[] = [
  'under_10k', '10k_25k', '25k_50k', '50k_100k', '100k_250k', 'over_250k', 'not_disclosed',
];
const TIMELINES: readonly Timeline[] = ['asap', '1_month', '2_3_months', '3_6_months', '6_months_plus', 'flexible'];
const SIZES: readonly CompanySize[] = [
  'startup', 'small_business', 'medium_business', 'enterprise', 'agency', 'nonprofit', 'individual',
];

function member<T extends string>(list: readonly T[], value: string | undefined): T | undefined {
  return list.find((item) => item === value);
}

export function hasBudgetAnswer(input: ScoreInput): boolean {
  if (member(BUDGETS, input.budgetRange) && input.budgetRange !== 'not_disclosed') return true;
  return Object.entries(input.customFields ?? {}).some(
    ([key, value]) => /budget/i.test(key) && typeof value === 'string' && value.trim() !== ''
  );
}

export function intentPoints(input: ScoreInput): number {
  const base = INTENT_POINTS[input.source] ?? 0;
  return AD_FORM_SOURCES.has(input.source) && hasBudgetAnswer(input) ? base + AD_FORM_BUDGET_BONUS : base;
}

export function fitScore(input: ScoreInput): number {
  const budgetRange = member(BUDGETS, input.budgetRange);
  const timeline = member(TIMELINES, input.timeline);
  const companySize = member(SIZES, input.companySize);
  if (!budgetRange || !timeline || !companySize) return NEUTRAL_FIT_SCORE;
  return calculateLeadScore({
    budgetRange,
    timeline,
    companySize,
    industry: input.industry,
    primaryChallenge: input.primaryChallenge ?? '',
  });
}

export function scoreLead(input: ScoreInput): { leadScore: number; priority: LeadPriority } {
  const leadScore = Math.min(100, Math.round(fitScore(input) * 0.6 + intentPoints(input)));
  return { leadScore, priority: determineLeadPriority(leadScore) };
}
