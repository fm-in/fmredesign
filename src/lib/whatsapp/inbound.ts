/**
 * What happens when someone messages the business WhatsApp number.
 *
 * The email equivalent is `src/lib/sales/replies.ts`, and this deliberately
 * mirrors it: find the lead, write the timeline entry, stop the sequence,
 * honour an opt-out, tell a human. The differences are that WhatsApp arrives
 * with only a phone number, and that a reply opens a 24-hour window in which
 * we may answer in plain text with no template at all.
 */

import { createNotification, notifyAdmins } from '@/lib/notifications';
import { recordActivity, stopSequence } from '@/lib/sales/activity';
import { ingestLead } from '@/lib/sales/intake/ingest';
import { loadOwner } from '@/lib/sales/lead-store';
import { toE164 } from '@/lib/sales/phone';
import { addSuppression, isSuppressed } from '@/lib/sales/suppression';
import { createTask, hasOpenTask } from '@/lib/sales/tasks';
import type { LeadRow } from '@/lib/sales/types';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppInteractive, sendWhatsAppText } from '@/lib/whatsapp/client';
import { captureEmail } from '@/lib/whatsapp/contact-capture';
import { findClientByPhone } from '@/lib/whatsapp/menu/audience';
import { looksLikeMenuRequest, renderRoot, routeTap, type MenuContext, type MenuReply } from '@/lib/whatsapp/menu';
import { businessHours } from '@/lib/whatsapp/hours';
import type { WhatsAppEvents, WhatsAppInboundMessage, WhatsAppStatusUpdate } from '@/lib/sales/intake/adapters/whatsapp';

/**
 * Anything whose whole text is one of these is an opt-out. Deliberately exact
 * rather than a substring match: "please don't stop sending these" contains
 * "stop" and means the opposite.
 */
const OPT_OUT = new Set(['stop', 'unsubscribe', 'cancel', 'end', 'quit', 'stop promotions']);

/**
 * Exact match, on the typed text or on the id behind a tapped button.
 *
 * Meta requires an opt-out button on a marketing template, and a tap on it
 * arrives with no text at all — so matching only on what someone types would
 * have ignored the one route Meta itself puts in front of them. Matching the
 * button id rather than its label also means the label can be reworded, or
 * localised, without quietly turning the opt-out off.
 */
function isOptOut(text: string | null, replyId: string | undefined): boolean {
  // A tap is judged on its id alone. Its visible label is our own display
  // copy — matching that too would opt someone out of a menu row we happened
  // to word "Stop", while adding nothing: we choose the ids, so a button that
  // should opt out is simply given one that is in this set. Meta's own
  // marketing opt-out button sends its label as the payload, so the common
  // case lands here anyway.
  const signal = replyId ?? text;
  return typeof signal === 'string' && OPT_OUT.has(signal.trim().toLowerCase());
}

const FIRST_TOUCH_TITLE = 'Reply on WhatsApp';
const MAX_BODY = 4_000;

/**
 * The automatic answer. Plain text, which is only legal because their message
 * just opened the 24-hour customer service window — no template, no approval,
 * no marketing category.
 *
 * What it promises depends on the clock. "Someone will reply shortly" at 03:00
 * on a Sunday is a promise that breaks by morning, and a broken promise reads
 * worse than an honest wait.
 */
function autoReply(now: Date): string {
  const { open, phrase } = businessHours(now);
  const opening = open
    ? `Thanks for messaging Freaking Minds. We have this and someone from the team will reply ${phrase}.`
    : `Thanks for messaging Freaking Minds. We have this — the team is offline right now and will come back to you ${phrase}.`;

  return (
    `${opening}\n\n` +
    'If it helps, tell us what you are trying to move — a number, a launch, a problem you have been circling — and we will come back with something specific.\n\n' +
    // How anyone finds the menu at all. It is deliberately the last line and
    // deliberately small: someone who has just asked a real question wants an
    // answer, not to be sent round a list of options.
    'Or send "menu" for the things you can check yourself.'
  );
}

/** Auto-reply once per conversation, not once per message. */
const AUTO_REPLY_QUIET_HOURS = 24;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function findLeadByPhone(phoneE164: string): Promise<LeadRow | null> {
  const { data } = await getSupabaseAdmin()
    .from('leads')
    .select('*')
    .eq('phone_e164', phoneE164)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(1);
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

/**
 * True when we have already sent this lead a WhatsApp message recently.
 *
 * Without this, every message in a back-and-forth would draw another identical
 * automatic reply, which is worse than not replying at all.
 */
async function repliedRecently(leadId: string): Promise<boolean> {
  const since = new Date(Date.now() - AUTO_REPLY_QUIET_HOURS * 3_600_000).toISOString();
  const { data } = await getSupabaseAdmin()
    .from('lead_activities')
    .select('id')
    .eq('lead_id', leadId)
    .eq('channel', 'whatsapp')
    .eq('direction', 'out')
    .gte('occurred_at', since)
    .limit(1);
  return Array.isArray(data) && data.length > 0;
}

/** A lead for a number that has never contacted us before. */
async function createLeadFromMessage(phoneE164: string, message: WhatsAppInboundMessage): Promise<LeadRow | null> {
  try {
    // The id is not used: ingest may have merged this number into an existing
    // lead, so the row is re-read below rather than assumed from the return.
    await ingestLead({
      source: 'whatsapp',
      phone: phoneE164,
      message: message.text ?? undefined,
      consent: {
        // They opened the conversation, so this is the same basis as someone
        // filling in the contact form: an inbound request, not a marketing
        // opt-in. It does not license a marketing template later.
        basis: 'inbound_request',
        capturedAt: new Date().toISOString(),
        evidence: { channel: 'whatsapp', messageId: message.id },
      },
    });
    return await findLeadByPhone(phoneE164);
  } catch (err) {
    console.error('[whatsapp] could not create a lead from an inbound message:', errorMessage(err));
    return null;
  }
}

async function handleMessage(message: WhatsAppInboundMessage): Promise<void> {
  const phoneE164 = toE164(message.from);
  if (!phoneE164) return;

  const body = message.text ? message.text.slice(0, MAX_BODY) : null;
  const optedOut = isOptOut(body, message.replyId);

  let lead = await findLeadByPhone(phoneE164);
  const isNewLead = !lead;
  if (!lead) lead = await createLeadFromMessage(phoneE164, message);

  if (!lead) {
    // Intake refused it. Never drop the message silently — a person is waiting.
    await notifyAdmins({
      type: 'general',
      title: 'WhatsApp message we could not attach to a lead',
      message: `From ${phoneE164}`,
      priority: 'high',
    });
    return;
  }

  await recordActivity({
    leadId: lead.id,
    type: 'message_received',
    channel: 'whatsapp',
    direction: 'in',
    body,
    providerMessageId: message.id,
    metadata: { messageType: message.type, ...(message.replyId ? { replyId: message.replyId } : {}) },
    actor: { id: 'lead', name: lead.name },
  });

  if (optedOut) {
    // Scoped to WhatsApp: they asked us to stop here, not everywhere.
    await addSuppression({ phoneE164, reason: 'unsubscribed', leadId: lead.id, channel: 'whatsapp' });
    await stopSequence(lead.id, 'unsubscribed');
    await recordActivity({
      leadId: lead.id,
      type: 'unsubscribed',
      channel: 'whatsapp',
      metadata: { via: message.replyId ? 'button' : 'keyword' },
    });
    return;
  }

  await stopSequence(lead.id, 'replied');

  /*
   * An address they sent us fills the one field WhatsApp cannot give us.
   *
   * Without it the lead is a dead end — `sequenceStartState` refuses a lead
   * with no email — so this runs before the menu and regardless of which
   * branch they are on. It only ever fills a gap; see contact-capture.ts for
   * why it does not go through `ingestLead`.
   */
  const captured = await captureEmail(lead.id, lead.email ?? null, body);

  /*
   * Try the menu before troubling anyone.
   *
   * A tap always has an answer waiting. Typed text only opens the menu when
   * it is plainly a greeting — someone who asked a real question wants an
   * answer, and being handed a list of options instead reads as a brush-off.
   */
  const client = await findClientByPhone(phoneE164);
  const menuCtx: MenuContext = {
    audience: client ? 'client' : 'lead',
    leadId: lead.id,
    clientId: client?.id,
    clientSlug: client?.slug,
    name: client?.name ?? lead.name,
    phoneE164,
  };

  let reply: MenuReply | null = null;
  if (message.replyId) {
    // Null for a tap on a menu we have since renamed. Treated as an ordinary
    // message rather than an error: a person reads it.
    reply = await routeTap(message.replyId, menuCtx);
  } else if (looksLikeMenuRequest(body)) {
    reply = await renderRoot(menuCtx);
  }

  /*
   * Confirm the address back to them, because a wrong one is far likelier to
   * be corrected if they can see which we took. It replaces the menu answer
   * rather than following it: two messages for one is noise, and a person is
   * reading this thread anyway.
   */
  if (captured) {
    // A handoff, not a plain answer. Giving us an address is not an answer to
    // whatever they actually wanted, so this confirms receipt and still puts
    // the conversation in front of a person — where a self-served menu reply
    // would have closed it out and told nobody.
    reply = {
      kind: 'handoff',
      reason: 'sent their email address',
      body: `Thanks — noted, we will use ${captured}. If that is not the right address, just say so here.`,
    };
  }

  let answered = false;
  if (reply && !(await isSuppressed({ phoneE164 }, 'whatsapp'))) {
    answered = await deliver(reply, phoneE164, lead.id);
    // A self-served answer is finished business — no task, no notification.
    // That is the whole point: the questions we answer fifty times a week
    // stop reaching a person at all. A handoff falls through on purpose, to
    // open the task; what it must not do is fall through to the auto-reply
    // as well, which would put two messages back to back in their chat.
    if (answered && reply.kind !== 'handoff') return;
  }

  const owner = await loadOwner(lead.owner_id);
  const notification = {
    type: 'general' as const,
    title: isNewLead ? 'New WhatsApp enquiry' : `${lead.name} messaged on WhatsApp`,
    message: body ? body.slice(0, 160) : `(${message.type})`,
    priority: 'high' as const,
    actionUrl: `/admin/leads/${lead.id}`,
  };
  if (owner) await createNotification({ recipientType: 'admin', recipientId: owner.id, ...notification });
  else await notifyAdmins(notification);

  if (!(await hasOpenTask(lead.id, FIRST_TOUCH_TITLE))) {
    await createTask({
      leadId: lead.id,
      ownerId: lead.owner_id,
      type: 'whatsapp',
      title: FIRST_TOUCH_TITLE,
      draftBody: body,
      dueAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
  }

  if (!answered) await maybeAutoReply(lead, phoneE164);
}

/**
 * Send whatever the menu produced, and put it on the timeline.
 *
 * Interactive messages and plain text are both session messages, legal only
 * because their own message just opened the 24-hour window.
 */
async function deliver(reply: MenuReply, phoneE164: string, leadId: string): Promise<boolean> {
  const result =
    reply.kind === 'interactive'
      ? await sendWhatsAppInteractive(phoneE164, reply.message)
      : await sendWhatsAppText(phoneE164, reply.body);

  // What the person sees, for the timeline: a menu's body, or the text.
  const shown = reply.kind === 'interactive' ? reply.message.body : reply.body;

  await recordActivity({
    leadId,
    type: result.ok ? 'message_sent' : 'message_failed',
    channel: 'whatsapp',
    direction: 'out',
    body: result.ok ? shown : null,
    providerMessageId: result.wamid ?? null,
    metadata: result.ok
      ? { automatic: true, menu: reply.kind }
      : { automatic: true, menu: reply.kind, error: result.error },
  });

  return result.ok;
}

async function maybeAutoReply(lead: LeadRow, phoneE164: string): Promise<void> {
  if (await repliedRecently(lead.id)) return;
  if (await isSuppressed({ phoneE164 }, 'whatsapp')) return;

  const message = autoReply(new Date());
  const result = await sendWhatsAppText(phoneE164, message);

  await recordActivity({
    leadId: lead.id,
    type: result.ok ? 'message_sent' : 'message_failed',
    channel: 'whatsapp',
    direction: 'out',
    body: result.ok ? message : null,
    providerMessageId: result.wamid ?? null,
    metadata: result.ok ? { automatic: true } : { automatic: true, error: result.error },
  });
}

/**
 * Delivery receipts. Matched to the outbound activity by `wamid`, so a message
 * that silently failed to arrive is visible on the timeline rather than only
 * in Meta's dashboard.
 */
async function handleStatus(status: WhatsAppStatusUpdate): Promise<void> {
  if (status.status !== 'failed' && status.status !== 'read') return;

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('lead_activities')
    .select('id, lead_id, metadata')
    .eq('provider_message_id', status.id)
    .limit(1);

  const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
  if (!row) return;

  const metadata = (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<string, unknown>;
  await supabase
    .from('lead_activities')
    .update({ metadata: { ...metadata, deliveryStatus: status.status } })
    .eq('id', row.id);

  if (status.status === 'failed') {
    await notifyAdmins({
      type: 'general',
      title: 'WhatsApp message failed to deliver',
      message: `Lead ${row.lead_id}`,
      priority: 'normal',
      actionUrl: `/admin/leads/${row.lead_id}`,
    });
  }
}

/** Entry point from the webhook adapter. Never throws: a retry would redeliver. */
export async function handleWhatsAppEvents(events: WhatsAppEvents): Promise<void> {
  for (const message of events.messages) {
    try {
      await handleMessage(message);
    } catch (err) {
      console.error('[whatsapp] inbound message failed:', errorMessage(err));
    }
  }
  for (const status of events.statuses) {
    try {
      await handleStatus(status);
    } catch (err) {
      console.error('[whatsapp] status update failed:', errorMessage(err));
    }
  }
}
