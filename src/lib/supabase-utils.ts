/**
 * Supabase Utility Functions
 * Key transformations and business logic extracted from lead-service.ts
 */

import {
  LEAD_SCORE_WEIGHTS,
  PRIORITY_THRESHOLDS,
  BUDGET_VALUES,
  TIMELINE_DAYS,
} from './admin/lead-types';
import type {
  LeadPriority,
  BudgetRange,
  Timeline,
  CompanySize,
} from './admin/lead-types';

// ─── Case Conversion ───────────────────────────────────────

/** Convert camelCase key to snake_case */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/** Convert snake_case key to camelCase */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/** Transform all object keys from camelCase to snake_case */
export function toSnakeCaseKeys<T extends Record<string, any>>(
  obj: T
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    result[camelToSnake(key)] = obj[key];
  }
  return result;
}

/**
 * Transform all object keys from snake_case to camelCase.
 * Handles nested objects, arrays, and null/undefined values.
 * Optionally accepts a defaults map to provide fallback values for specific camelCase keys.
 */
export function toCamelCaseKeys<T extends Record<string, any>>(
  obj: T,
  defaults?: Record<string, unknown>
): Record<string, any> {
  if (obj === null || obj === undefined) return obj;
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = snakeToCamel(key);
    const value = obj[key];
    if (Array.isArray(value)) {
      result[camelKey] = value.map((item) =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
          ? toCamelCaseKeys(item)
          : item
      );
    } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      result[camelKey] = toCamelCaseKeys(value);
    } else {
      result[camelKey] = value;
    }
  }
  // Apply defaults for any key that is null or undefined
  if (defaults) {
    for (const [dKey, dVal] of Object.entries(defaults)) {
      if (result[dKey] === null || result[dKey] === undefined) {
        result[dKey] = dVal;
      }
    }
  }
  return result;
}

// ─── Lead Scoring ───────────────────────────────────────────

interface LeadScoreInput {
  budgetRange: BudgetRange;
  timeline: Timeline;
  companySize: CompanySize;
  industry?: string;
  primaryChallenge: string;
}

function getBudgetScore(budgetRange: BudgetRange): number {
  const range = BUDGET_VALUES[budgetRange] || BUDGET_VALUES['not_disclosed'];
  const midpoint = (range.min + range.max) / 2;
  if (midpoint >= 100000) return 100;
  if (midpoint >= 50000) return 80;
  if (midpoint >= 25000) return 60;
  if (midpoint >= 10000) return 40;
  return 20;
}

function getTimelineScore(timeline: Timeline): number {
  const days = TIMELINE_DAYS[timeline];
  if (days <= 30) return 100;
  if (days <= 90) return 80;
  if (days <= 180) return 60;
  if (days <= 365) return 40;
  return 20;
}

function getCompanySizeScore(companySize: CompanySize): number {
  const scores: Record<CompanySize, number> = {
    enterprise: 100,
    medium_business: 80,
    small_business: 60,
    agency: 70,
    startup: 50,
    nonprofit: 40,
    individual: 30,
  };
  return scores[companySize] || 50;
}

function getIndustryFitScore(industry?: string): number {
  const highFitIndustries = ['Technology', 'E-commerce', 'Healthcare', 'Finance'];
  if (industry && highFitIndustries.includes(industry)) return 100;
  return 70;
}

function getUrgencyScore(timeline: Timeline, challenge: string): number {
  let score = 50;
  if (timeline === 'asap') score += 30;
  else if (timeline === '1_month') score += 20;

  const urgentKeywords = ['urgent', 'asap', 'immediately', 'crisis', 'critical', 'deadline'];
  if (urgentKeywords.some((kw) => challenge.toLowerCase().includes(kw))) {
    score += 20;
  }
  return Math.min(100, score);
}

/** Calculate lead score (0-100) based on weighted factors */
export function calculateLeadScore(lead: LeadScoreInput): number {
  let score = 0;
  score += getBudgetScore(lead.budgetRange) * LEAD_SCORE_WEIGHTS.BUDGET;
  score += getTimelineScore(lead.timeline) * LEAD_SCORE_WEIGHTS.TIMELINE;
  score += getCompanySizeScore(lead.companySize) * LEAD_SCORE_WEIGHTS.COMPANY_SIZE;
  score += getIndustryFitScore(lead.industry) * LEAD_SCORE_WEIGHTS.INDUSTRY_FIT;
  score += getUrgencyScore(lead.timeline, lead.primaryChallenge) * LEAD_SCORE_WEIGHTS.URGENCY;
  return Math.round(Math.min(100, Math.max(0, score)));
}

/** Map a numeric score to a priority label */
export function determineLeadPriority(score: number): LeadPriority {
  if (score >= PRIORITY_THRESHOLDS.HOT) return 'hot';
  if (score >= PRIORITY_THRESHOLDS.WARM) return 'warm';
  if (score >= PRIORITY_THRESHOLDS.COOL) return 'cool';
  return 'cold';
}

// ─── Mobile Number Normalization ────────────────────────────

/** Normalize an Indian mobile number to +91XXXXXXXXXX format */
export function normalizeMobileNumber(mobile: string): string {
  if (!mobile) return '';
  const normalized = mobile.replace(/[^\d+]/g, '');
  if (normalized.startsWith('+91')) return normalized;
  if (normalized.startsWith('91') && normalized.length === 12) return `+${normalized}`;
  if (normalized.length === 10 && !normalized.startsWith('0')) return `+91${normalized}`;
  return normalized;
}

// ─── Role Permissions ───────────────────────────────────────

// Stored on authorized_users when a user is created or re-roled. Sales access
// follows the role, so nobody has to add sales.* to a user record by hand.
const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['read', 'write', 'delete', 'admin', 'users', 'clients', 'projects', 'invoices', 'settings', 'sales.read', 'sales.write'],
  admin: ['read', 'write', 'delete', 'admin', 'users', 'clients', 'projects', 'invoices', 'settings', 'sales.read', 'sales.write'],
  manager: ['read', 'write', 'clients', 'projects', 'invoices', 'sales.read', 'sales.write'],
  editor: ['read', 'write', 'clients', 'projects'],
  viewer: ['read'],
};

/** Get permission list for a given role key */
export function getRolePermissions(role: string): string[] {
  return ROLE_PERMISSIONS[role] || [];
}
