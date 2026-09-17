import { describe, it, expect } from 'vitest';
import { fitScore, hasBudgetAnswer, intentPoints, NEUTRAL_FIT_SCORE, scoreLead } from '../scoring';

describe('intentPoints', () => {
  it('ranks a booking highest', () => {
    expect(intentPoints({ source: 'cal_booking' })).toBe(40);
    expect(intentPoints({ source: 'website_form' })).toBe(20);
    expect(intentPoints({ source: 'scorecard' })).toBe(15);
    expect(intentPoints({ source: 'connector' })).toBe(10);
    expect(intentPoints({ source: 'other' })).toBe(0);
  });

  it('adds the budget bonus only to ad forms that answered a budget question', () => {
    expect(intentPoints({ source: 'meta_lead_ads' })).toBe(15);
    expect(intentPoints({ source: 'meta_lead_ads', customFields: { what_is_your_budget: '₹50,000' } })).toBe(25);
    expect(intentPoints({ source: 'website_form', customFields: { budget: 'high' } })).toBe(20);
  });
});

describe('hasBudgetAnswer', () => {
  it('ignores not_disclosed and empty answers', () => {
    expect(hasBudgetAnswer({ source: 'x', budgetRange: 'not_disclosed' })).toBe(false);
    expect(hasBudgetAnswer({ source: 'x', customFields: { budget: '  ' } })).toBe(false);
    expect(hasBudgetAnswer({ source: 'x', budgetRange: '25k_50k' })).toBe(true);
  });
});

describe('fitScore', () => {
  it('is neutral when qualification answers are missing or invalid', () => {
    expect(fitScore({ source: 'meta_lead_ads' })).toBe(NEUTRAL_FIT_SCORE);
    expect(fitScore({ source: 'x', budgetRange: 'lots', timeline: 'asap', companySize: 'enterprise' })).toBe(NEUTRAL_FIT_SCORE);
  });

  it('uses the existing weighted score when answers are valid', () => {
    const score = fitScore({ source: 'website_form', budgetRange: 'over_250k', timeline: 'asap', companySize: 'enterprise' });
    expect(score).toBeGreaterThan(NEUTRAL_FIT_SCORE);
  });
});

describe('scoreLead', () => {
  it('combines 60% fit with intent and caps at 100', () => {
    expect(scoreLead({ source: 'cal_booking' }).leadScore).toBe(70);
    expect(scoreLead({ source: 'website_form' }).leadScore).toBe(50);
    const top = scoreLead({ source: 'cal_booking', budgetRange: 'over_250k', timeline: 'asap', companySize: 'enterprise' });
    expect(top.leadScore).toBeLessThanOrEqual(100);
    expect(['hot', 'warm', 'cool', 'cold']).toContain(top.priority);
  });
});
