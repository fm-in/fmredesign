/**
 * Lead Management Types
 * Comprehensive type definitions for lead capture and management system
 */

// Lead Status Enum
export type LeadStatus = 
  | 'new'
  | 'contacted' 
  | 'qualified'
  | 'discovery_scheduled'
  | 'discovery_completed'
  | 'proposal_sent'
  | 'negotiating'
  | 'won'
  | 'lost'
  | 'archived';

// Lead Source Tracking
export type LeadSource =
  | 'website_form'
  | 'referral'
  | 'social_media'
  | 'google_ads'
  | 'cold_outreach'
  | 'event'
  | 'partner'
  | 'other'
  | 'meta_lead_ads'
  | 'google_lead_form'
  | 'connector'
  | 'cal_booking'
  | 'scorecard'
  /** Messaged the business WhatsApp number without filling anything in. */
  | 'whatsapp';

// Project Types for Lead Classification
export type ProjectType = 
  | 'website_design'
  | 'ecommerce'
  | 'mobile_app'
  | 'web_app'
  | 'branding'
  | 'digital_marketing'
  | 'full_service'
  | 'consultation'
  | 'maintenance'
  | 'other';

// Budget Ranges for Lead Scoring
export type BudgetRange = 
  | 'under_10k'
  | '10k_25k'
  | '25k_50k'
  | '50k_100k'
  | '100k_250k'
  | 'over_250k'
  | 'not_disclosed';

// Timeline Options
export type Timeline = 
  | 'asap'
  | '1_month'
  | '2_3_months'
  | '3_6_months'
  | '6_months_plus'
  | 'flexible';

// Company Size for Lead Qualification
export type CompanySize = 
  | 'startup'
  | 'small_business'
  | 'medium_business'
  | 'enterprise'
  | 'agency'
  | 'nonprofit'
  | 'individual';

// Lead Priority Based on Scoring
export type LeadPriority = 'hot' | 'warm' | 'cool' | 'cold';

// Main Lead Profile Interface
export interface LeadProfile {
  // Unique Identifier
  id: string;
  
  // Basic Information
  name: string;
  email: string;
  phone?: string;
  company: string;
  website?: string;
  
  // Professional Details
  jobTitle?: string;
  companySize: CompanySize;
  industry?: string;
  
  // Project Information
  projectType: ProjectType;
  projectDescription: string;
  budgetRange: BudgetRange;
  timeline: Timeline;
  
  // Challenges and Needs
  primaryChallenge: string;
  additionalChallenges?: string[];
  specificRequirements?: string;
  
  // Lead Management
  status: LeadStatus;
  priority: LeadPriority;
  source: LeadSource;
  utmCampaign?: string | null;
  leadScore: number; // 0-100
  
  // Assignment and Tracking
  assignedTo?: string;
  nextAction?: string;
  followUpDate?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastContactDate?: Date;
  
  // Additional Metadata
  notes?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  
  // Conversion Tracking
  discoveryScheduled?: boolean;
  discoveryCompletedAt?: Date;
  proposalSentAt?: Date;
  convertedToClientAt?: Date;
  clientId?: string;
  ownerId?: string | null;
  leadSource?: 'website' | 'scraped';
}

// Lead Creation Input (for forms)
export interface LeadInput {
  name: string;
  email: string;
  phone?: string;
  company: string;
  website?: string;
  jobTitle?: string;
  companySize: CompanySize;
  industry?: string;
  projectType: ProjectType;
  projectDescription: string;
  budgetRange: BudgetRange;
  timeline: Timeline;
  primaryChallenge: string;
  additionalChallenges?: string[];
  specificRequirements?: string;
  source?: LeadSource;
  customFields?: Record<string, any>;
}

// Lead Update Interface
export interface LeadUpdate {
  status?: LeadStatus;
  assignedTo?: string;
  nextAction?: string;
  followUpDate?: Date;
  notes?: string;
  tags?: string[];
  priority?: LeadPriority;
  leadScore?: number;
  customFields?: Record<string, any>;
}

// Lead Scoring Criteria
export interface LeadScoringCriteria {
  budget: number;        // Weight: 40%
  timeline: number;      // Weight: 20%
  companySize: number;   // Weight: 20%
  industryFit: number;   // Weight: 10%
  urgency: number;       // Weight: 10%
}

// Lead Analytics Interface
export interface LeadAnalytics {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  conversionRate: number;
  averageLeadScore: number;
  leadsBySource: Record<LeadSource, number>;
  leadsByStatus: Record<LeadStatus, number>;
  leadsByPriority: Record<LeadPriority, number>;
  averageTimeToConversion: number;
  monthlyTrends: Array<{
    month: string;
    leads: number;
    conversions: number;
  }>;
}

// Lead Filter Options
export interface LeadFilters {
  status?: LeadStatus[];
  priority?: LeadPriority[];
  source?: LeadSource[];
  projectType?: ProjectType[];
  budgetRange?: BudgetRange[];
  companySize?: CompanySize[];
  assignedTo?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  searchQuery?: string;
  owner?: 'mine' | 'unassigned';
}

// Lead Sort Options
export interface LeadSortOptions {
  field: keyof LeadProfile;
  direction: 'asc' | 'desc';
}

// Lead Dashboard Stats
export interface LeadDashboardStats {
  totalLeads: number;
  hotLeads: number;
  recentLeads: number;
  conversionRate: number;
  averageLeadValue: number;
  topSources: Array<{
    source: LeadSource;
    count: number;
    percentage: number;
  }>;
  recentActivity: Array<{
    leadId: string;
    action: string;
    timestamp: Date;
    user: string;
  }>;
}

// Utility Functions Type Definitions
export interface LeadUtils {
  calculateLeadScore(lead: LeadProfile): number;
  determineLeadPriority(score: number): LeadPriority;
  getBudgetRangeValue(range: BudgetRange): { min: number; max: number };
  getTimelineInDays(timeline: Timeline): number;
  formatLeadStatus(status: LeadStatus): string;
  getStatusColor(status: LeadStatus): string;
  getPriorityColor(priority: LeadPriority): string;
  validateLeadInput(input: LeadInput): string[];
  generateLeadId(): string;
}

// Constants for Lead Management
export const LEAD_SCORE_WEIGHTS = {
  BUDGET: 0.4,
  TIMELINE: 0.2,
  COMPANY_SIZE: 0.2,
  INDUSTRY_FIT: 0.1,
  URGENCY: 0.1
} as const;

export const PRIORITY_THRESHOLDS = {
  HOT: 80,
  WARM: 60,
  COOL: 40,
  COLD: 0
} as const;

export const BUDGET_VALUES: Record<BudgetRange, { min: number; max: number }> = {
  'under_10k': { min: 0, max: 10000 },
  '10k_25k': { min: 10000, max: 25000 },
  '25k_50k': { min: 25000, max: 50000 },
  '50k_100k': { min: 50000, max: 100000 },
  '100k_250k': { min: 100000, max: 250000 },
  'over_250k': { min: 250000, max: 1000000 },
  'not_disclosed': { min: 0, max: 0 }
};

export const TIMELINE_DAYS: Record<Timeline, number> = {
  'asap': 7,
  '1_month': 30,
  '2_3_months': 75,
  '3_6_months': 135,
  '6_months_plus': 365,
  'flexible': 180
};

// Industry Categories for Better Targeting
export const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'E-commerce',
  'Education',
  'Real Estate',
  'Manufacturing',
  'Professional Services',
  'Hospitality',
  'Non-profit',
  'Government',
  'Entertainment',
  'Automotive',
  'Fashion',
  'Food & Beverage',
  'Other'
] as const;

export type Industry = typeof INDUSTRIES[number];