/**
 * Inngest Function Registry
 * Re-exports all functions for the serve() handler.
 */

export { inngest } from './client';

// Functions
export { logAuditEventFn } from './functions/audit';
export { sendNotificationFn, sendNotificationBulkFn } from './functions/notifications';
export { sendEmailFn, sendEmailTemplateFn } from './functions/emails';
export { deliverWebhooksFn } from './functions/webhooks';
export { publishToSocialFn } from './functions/social';
export { generateAIContentFn } from './functions/ai-content';
export { platformEventFanoutFn } from './functions/platform-events';
export { autoInvoiceDailyCron, generateAutoInvoiceFn } from './functions/auto-invoice';
export { salesLeadCreatedFn, salesSequenceFn, salesMetaLeadgenFn, salesMeetingPrepFn } from './functions/sales';
export { academyCheckoutReminderFn } from './functions/academy';

// All functions array for serve()
import { logAuditEventFn } from './functions/audit';
import { sendNotificationFn, sendNotificationBulkFn } from './functions/notifications';
import { sendEmailFn, sendEmailTemplateFn } from './functions/emails';
import { deliverWebhooksFn } from './functions/webhooks';
import { publishToSocialFn } from './functions/social';
import { generateAIContentFn } from './functions/ai-content';
import { platformEventFanoutFn } from './functions/platform-events';
import { autoInvoiceDailyCron, generateAutoInvoiceFn } from './functions/auto-invoice';
import { scrapeResourcesCron } from './functions/resources-scrape';
import { salesLeadCreatedFn, salesSequenceFn, salesMetaLeadgenFn, salesMeetingPrepFn } from './functions/sales';
import { academyCheckoutReminderFn } from './functions/academy';

export const allFunctions = [
  logAuditEventFn,
  sendNotificationFn,
  sendNotificationBulkFn,
  sendEmailFn,
  sendEmailTemplateFn,
  deliverWebhooksFn,
  publishToSocialFn,
  generateAIContentFn,
  platformEventFanoutFn,
  autoInvoiceDailyCron,
  generateAutoInvoiceFn,
  scrapeResourcesCron,
  salesLeadCreatedFn,
  salesSequenceFn,
  salesMetaLeadgenFn,
  salesMeetingPrepFn,
  academyCheckoutReminderFn,
];
