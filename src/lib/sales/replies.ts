/**
 * What happens when a lead answers a sales email, or one bounces.
 * Resend sends `email.received` for mail addressed to SALES_REPLY_TO and
 * `email.bounced` / `email.complained` for mail we sent.
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { getResend } from '@/lib/email/resend';
import { createNotification, notifyAdmins } from '@/lib/notifications';
import { recordActivity, stopSequence } from '@/lib/sales/activity';
import { isRecord, readString } from '@/lib/sales/intake/adapters/verify';
import { normaliseEmail } from '@/lib/sales/intake/normalise';
import { loadOwner } from '@/lib/sales/lead-store';
import { SALES_FROM_DEFAULT } from '@/lib/sales/send-email';
import { addSuppression } from '@/lib/sales/suppression';
import { createTask, hasOpenTask } from '@/lib/sales/tasks';
import { unsubscribeEmail } from '@/lib/sales/unsubscribe';
import type { LeadRow } from '@/lib/sales/types';

const UNSUBSCRIBE_SUBJECT = /\bunsubscribe\b/i;
const MAX_REPLY_BODY = 10_000;
const BOUNCE_TASK_TITLE = 'Email bounced: confirm contact details';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Forward a received email, logging (never the address or body) and swallowing any failure. */
async function forwardToInbox(
  resend: ReturnType<typeof getResend>,
  options: { emailId: string; to: string; from: string }
): Promise<void> {
  if (!resend) return;
  try {
    const { error } = await resend.emails.receiving.forward(options);
    if (error) console.error('[sales] resend forward failed:', error.message);
  } catch (err) {
    console.error('[sales] resend forward failed:', errorMessage(err));
  }
}

export function extractAddress(value: string): string | undefined {
  const bracketed = value.match(/<([^>]+)>/);
  return normaliseEmail(bracketed ? bracketed[1] : value);
}

async function findLeadByEmail(email: string): Promise<LeadRow | null> {
  const { data } = await getSupabaseAdmin()
    .from('leads')
    .select('*')
    .eq('email', email)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(1);
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

function forwardingSender(): string {
  return process.env.SALES_FROM_EMAIL || SALES_FROM_DEFAULT;
}

export async function handleResendEvent(payload: unknown): Promise<void> {
  if (!isRecord(payload) || !isRecord(payload.data)) return;
  const type = readString(payload, 'type');
  if (type === 'email.received') return handleReceived(payload.data);
  if (type === 'email.bounced' || type === 'email.complained') return handleDeliveryFailure(type, payload.data);
}

async function handleReceived(data: Record<string, unknown>): Promise<void> {
  const from = extractAddress(readString(data, 'from') ?? '');
  const emailId = readString(data, 'email_id');
  const subject = readString(data, 'subject') ?? '(no subject)';
  if (!from || !emailId) return;

  const resend = getResend();
  const lead = await findLeadByEmail(from);

  if (!lead) {
    await notifyAdmins({ type: 'general', title: 'Reply from an unknown sender', message: `${from}: ${subject}`, priority: 'normal' });
    const team = process.env.NOTIFICATION_EMAIL;
    if (team) await forwardToInbox(resend, { emailId, to: team, from: forwardingSender() });
    return;
  }

  let body: string | null = null;
  if (resend) {
    try {
      const { data: full, error } = await resend.emails.receiving.get(emailId);
      if (error) {
        console.error('[sales] resend get failed:', error.message);
      } else {
        const text = full?.text ?? (full?.html ? full.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : null);
        body = text ? text.slice(0, MAX_REPLY_BODY) : null;
      }
    } catch (err) {
      console.error('[sales] resend get failed:', errorMessage(err));
    }
  }

  await recordActivity({
    leadId: lead.id,
    type: 'email_received',
    channel: 'email',
    direction: 'in',
    subject,
    body,
    providerMessageId: readString(data, 'message_id') ?? emailId,
    actor: { id: 'lead', name: lead.name },
  });

  if (UNSUBSCRIBE_SUBJECT.test(subject)) {
    await unsubscribeEmail(from, 'reply');
    return;
  }

  await stopSequence(lead.id, 'replied');

  const owner = await loadOwner(lead.owner_id);
  const forwardTo = owner?.email ?? process.env.NOTIFICATION_EMAIL;
  if (forwardTo) await forwardToInbox(resend, { emailId, to: forwardTo, from: forwardingSender() });

  const notification = {
    type: 'general' as const,
    title: `${lead.name} replied`,
    message: subject,
    priority: 'high' as const,
    actionUrl: `/admin/leads/${lead.id}`,
  };
  if (owner) await createNotification({ recipientType: 'admin', recipientId: owner.id, ...notification });
  else await notifyAdmins(notification);
}

async function handleDeliveryFailure(type: 'email.bounced' | 'email.complained', data: Record<string, unknown>): Promise<void> {
  const recipients = Array.isArray(data.to) ? data.to.filter((value): value is string => typeof value === 'string') : [];
  const reason = type === 'email.bounced' ? 'bounced' : 'complaint';

  for (const recipient of recipients) {
    const email = extractAddress(recipient);
    if (!email) continue;

    const lead = await findLeadByEmail(email);
    await addSuppression({ email, reason, leadId: lead?.id ?? null });
    if (!lead) continue;

    await recordActivity({
      leadId: lead.id,
      type: 'email_bounced',
      channel: 'email',
      subject: readString(data, 'subject') ?? null,
      metadata: { event: type },
    });
    await stopSequence(lead.id, 'bounced');

    // A complaint means "stop"; only a bounce is worth a human follow-up.
    // Guarded against redelivery: a retried webhook must not open a second task.
    if (reason === 'bounced' && !(await hasOpenTask(lead.id, BOUNCE_TASK_TITLE))) {
      await createTask({
        leadId: lead.id,
        ownerId: lead.owner_id,
        type: 'call',
        title: BOUNCE_TASK_TITLE,
        dueAt: new Date().toISOString(),
      });
    }
  }
}
