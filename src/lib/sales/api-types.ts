/** Shapes the admin sales APIs return (camelCase). Client-safe. */

import type { LeadPriority, LeadStatus } from '@/lib/admin/lead-types';
import type { ActivityType, MeetingStatus, SequenceStatus, TaskStatus, TaskType } from '@/lib/sales/types';

/** Human names for the follow-up sequence keys in `src/lib/sales/sequence.ts`'s SEQUENCES registry. */
export const SEQUENCE_LABELS: Record<string, string> = {
  'brief-v1': 'Project brief',
  'enquiry-v1': 'Enquiry',
  'ad-lead-v1': 'Ad lead',
  'scorecard-v1': 'Scorecard',
};

export const STAGE_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  discovery_scheduled: 'Discovery scheduled',
  discovery_completed: 'Discovery held',
  proposal_sent: 'Proposal sent',
  negotiating: 'Negotiating',
  won: 'Won',
  lost: 'Lost',
  archived: 'Archived',
};

export interface SalesLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  phoneE164: string | null;
  company: string | null;
  website: string | null;
  status: LeadStatus;
  priority: LeadPriority | null;
  leadScore: number | null;
  source: string | null;
  sourceDetail: string | null;
  ownerId: string | null;
  assignedTo: string | null;
  projectDescription: string | null;
  budgetRange: string | null;
  timeline: string | null;
  customFields: Record<string, unknown> | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  sequenceKey: string | null;
  sequenceStatus: SequenceStatus | null;
  sequenceStopReason: string | null;
  firstResponseAt: string | null;
  lastActivityAt: string | null;
  dealValue: number | null;
  currency: string | null;
  lostReason: string | null;
  clientId: string | null;
  createdAt: string;
}

export interface SalesActivity {
  id: string;
  leadId: string;
  type: ActivityType;
  channel: string | null;
  direction: 'in' | 'out' | null;
  subject: string | null;
  body: string | null;
  metadata: Record<string, unknown>;
  actorName: string | null;
  occurredAt: string;
}

export interface SalesTaskItem {
  id: string;
  leadId: string;
  ownerId: string | null;
  type: TaskType;
  title: string;
  draftBody: string | null;
  dueAt: string;
  status: TaskStatus;
  completedAt: string | null;
  lead?: { id: string; name: string; company: string | null; email: string | null; phoneE164: string | null } | null;
}

export interface SalesMeeting {
  id: string;
  leadId: string;
  title: string | null;
  startsAt: string;
  endsAt: string;
  status: MeetingStatus;
  meetingUrl: string | null;
}

export interface OwnerOption {
  id: string;
  name: string;
}

export interface SequenceStartInfo {
  recommended: string | null;
  canStart: boolean;
  blockedReason: string | null;
  /** A start was queued (latest activity is `sequence_started`) but the sequence has not enrolled yet. */
  starting: boolean;
}

export interface LeadDetailPayload {
  lead: SalesLead;
  activities: SalesActivity[];
  tasks: SalesTaskItem[];
  meetings: SalesMeeting[];
  owners: OwnerOption[];
  suppressed: boolean;
  sequences: SequenceStartInfo;
  permissions: { canAssign: boolean; userId: string };
}

export function formatIst(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
