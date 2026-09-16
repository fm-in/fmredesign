/**
 * Shared sales types and constants.
 *
 * Client-safe: this file must never import server-only modules, because the
 * admin UI and public forms import it.
 */

import type { LeadPriority, LeadSource, LeadStatus } from '@/lib/admin/lead-types';

export type SalesSource = LeadSource;

export const SALES_SOURCES: readonly SalesSource[] = [
  'website_form',
  'referral',
  'social_media',
  'google_ads',
  'cold_outreach',
  'event',
  'partner',
  'other',
  'meta_lead_ads',
  'google_lead_form',
  'connector',
  'cal_booking',
  'scorecard',
];

export function isSalesSource(value: unknown): value is SalesSource {
  return typeof value === 'string' && (SALES_SOURCES as readonly string[]).includes(value);
}

/** Moving a lead into any of these stops its follow-up sequence. */
export const STAGES_BEYOND_CONTACTED: readonly LeadStatus[] = [
  'qualified',
  'discovery_scheduled',
  'discovery_completed',
  'proposal_sent',
  'negotiating',
  'won',
  'lost',
  'archived',
];

export interface Attribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  landingPage?: string;
  referrer?: string;
  gclid?: string;
  fbclid?: string;
}

export type ConsentBasis = 'inbound_request' | 'consent' | 'none';

export interface ConsentRecord {
  basis: ConsentBasis;
  /** What the person saw or did: form text, ad form id, IP, timestamp. */
  evidence: Record<string, unknown>;
  capturedAt: string;
}

/** What every intake source produces before calling ingestLead. */
export interface IntakeLead {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  jobTitle?: string;
  /** Free-text enquiry; stored as project_description. */
  message?: string;
  source: SalesSource;
  sourceDetail?: string;
  externalSourceId?: string;
  attribution?: Attribution;
  consent: ConsentRecord;
  customFields?: Record<string, unknown>;
  tags?: string[];
  projectType?: string;
  budgetRange?: string;
  timeline?: string;
  companySize?: string;
  industry?: string;
  primaryChallenge?: string;
  additionalChallenges?: string[];
  specificRequirements?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export type ActivityType =
  | 'note'
  | 'form_submitted'
  | 'email_sent'
  | 'email_failed'
  | 'email_received'
  | 'email_bounced'
  | 'task_created'
  | 'task_completed'
  | 'meeting_booked'
  | 'meeting_rescheduled'
  | 'meeting_cancelled'
  | 'meeting_completed'
  | 'stage_changed'
  | 'owner_changed'
  | 'sequence_started'
  | 'sequence_stopped'
  | 'ai_brief'
  | 'unsubscribed';

export type TaskType = 'call' | 'whatsapp' | 'linkedin' | 'instagram' | 'email' | 'follow_up' | 'custom';
export type TaskStatus = 'open' | 'done' | 'skipped';
export type MeetingStatus = 'booked' | 'cancelled' | 'completed' | 'no_show';
export type SuppressionReason = 'unsubscribed' | 'bounced' | 'complaint' | 'deletion_request' | 'manual';
export type SequenceStatus = 'active' | 'completed' | 'stopped';
export type SequenceStopReason =
  | 'replied'
  | 'booked'
  | 'stage_advanced'
  | 'unsubscribed'
  | 'bounced'
  | 'no_email'
  | 'no_consent'
  | 'not_configured'
  | 'manual'
  | 'automation_off';

export interface SalesSettings {
  automationEnabled: boolean;
  /** Cal.com event path, e.g. "fm-in/15min". */
  bookingLink: string;
  /** Cal.com event path for the longer scoping call, e.g. "fm-in/30min". */
  bookingLinkLong: string;
}

export interface Actor {
  id: string;
  name: string;
}

export const SYSTEM_ACTOR: Actor = { id: 'system', name: 'Automation' };

/** Columns of `leads` that sales code reads. Row shapes are type aliases, not interfaces, so they are assignable to Record<string, unknown>. */
export type LeadRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  phone_e164: string | null;
  company: string | null;
  website: string | null;
  job_title: string | null;
  company_size: string | null;
  industry: string | null;
  project_type: string | null;
  project_description: string | null;
  budget_range: string | null;
  timeline: string | null;
  primary_challenge: string | null;
  status: LeadStatus;
  priority: LeadPriority | null;
  source: string | null;
  source_detail: string | null;
  external_source_id: string | null;
  utm_campaign: string | null;
  lead_score: number | null;
  owner_id: string | null;
  assigned_to: string | null;
  custom_fields: Record<string, unknown> | null;
  tags: string[] | null;
  consent_basis: ConsentBasis | null;
  sequence_key: string | null;
  sequence_step: number | null;
  sequence_status: SequenceStatus | null;
  sequence_stop_reason: string | null;
  first_response_at: string | null;
  last_activity_at: string | null;
  deal_value: number | null;
  currency: string | null;
  lost_reason: string | null;
  client_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export type ActivityRow = {
  id: string;
  lead_id: string;
  type: ActivityType;
  channel: string | null;
  direction: 'in' | 'out' | null;
  subject: string | null;
  body: string | null;
  metadata: Record<string, unknown>;
  provider_message_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  occurred_at: string;
  created_at: string;
}

export type TaskRow = {
  id: string;
  lead_id: string;
  owner_id: string | null;
  type: TaskType;
  title: string;
  draft_body: string | null;
  due_at: string;
  status: TaskStatus;
  completed_at: string | null;
  completed_by: string | null;
  created_by: string | null;
  created_at: string;
}

export type MeetingRow = {
  id: string;
  lead_id: string;
  provider: 'calcom';
  external_uid: string;
  title: string | null;
  starts_at: string;
  ends_at: string;
  status: MeetingStatus;
  meeting_url: string | null;
  attendee_email: string | null;
  owner_id: string | null;
  raw: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function generateSalesId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export const LEAD_STATUSES: readonly LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'discovery_scheduled',
  'discovery_completed',
  'proposal_sent',
  'negotiating',
  'won',
  'lost',
  'archived',
];

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === 'string' && (LEAD_STATUSES as readonly string[]).includes(value);
}
