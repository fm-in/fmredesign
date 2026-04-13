/**
 * Inngest Event Type Definitions
 * All events that can be sent through the Inngest durable job queue.
 */

import type { NotificationType } from '@/lib/notifications';
import type { AuditAction } from '@/lib/admin/audit-log';
import type { EventType as PlatformEventType } from '@/lib/events/types';

// ---------------------------------------------------------------------------
// Event data types
// ---------------------------------------------------------------------------

export interface NotificationSendData {
  recipientType: 'admin' | 'client' | 'talent';
  recipientId?: string;
  clientId?: string;
  talentId?: string;
  type: NotificationType;
  title: string;
  message?: string;
  priority?: 'low' | 'normal' | 'high';
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationSendBulkData {
  notifications: NotificationSendData[];
}

export interface EmailSendData {
  to: string;
  subject: string;
  html: string;
}

export interface EmailSendTemplateData {
  template: string;
  templateData: Record<string, unknown>;
  to?: string;
}

export interface AuditLogData {
  user_id: string;
  user_name: string;
  action: AuditAction;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
}

export interface WebhookDeliverData {
  eventType: string;
  payload: {
    entityId: string;
    actor: { id: string; name: string };
    timestamp: string;
    data?: Record<string, unknown>;
  };
}

export interface SocialPublishData {
  contentId: string;
  triggeredBy: { userId: string; userName: string };
  ipAddress?: string;
}

export interface AIGenerateContentData {
  mode: 'monthly' | 'weekly' | 'single';
  clientId: string;
  options?: {
    startDate?: string;
    endDate?: string;
    platforms?: string[];
    postsPerWeek?: number;
    platform?: string;
    type?: string;
    topic?: string;
    pillar?: string;
    scheduledDate?: string;
  };
  batchId: string;
  triggeredBy: { userId: string; userName: string };
  ipAddress?: string;
}

export interface AutoInvoiceGenerateData {
  clientId: string;
  clientName: string;
  clientEmail: string;
  billingDay: number;
  autoSend: boolean;
  lineItems: { description: string; sacCode?: string; quantity: number; rate: number; amount: number }[];
  currency: string;
  taxRate: number;
  notes?: string;
  terms?: string;
}

export interface PlatformEventData {
  eventType: PlatformEventType;
  entityId: string;
  actor: { id: string; name: string };
  timestamp: string;
  data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Inngest event map (used to type the client)
// ---------------------------------------------------------------------------

export type InngestEvents = {
  'notification/send': { data: NotificationSendData };
  'notification/send-bulk': { data: NotificationSendBulkData };
  'email/send': { data: EmailSendData };
  'email/send-template': { data: EmailSendTemplateData };
  'audit/log': { data: AuditLogData };
  'webhook/deliver': { data: WebhookDeliverData };
  'social/publish': { data: SocialPublishData };
  'ai/generate-content': { data: AIGenerateContentData };
  'platform/event': { data: PlatformEventData };
  'invoice/auto-generate': { data: AutoInvoiceGenerateData };
};
