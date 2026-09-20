/**
 * Reading WhatsApp conversations out of the lead timeline.
 *
 * There is no messages table: `lead_activities` already stores a channel, a
 * direction, a body and the provider's message id, which is every field a
 * thread needs. A second store would only be a copy that drifts.
 *
 * The 24-hour window is the thing this module exists to compute. WhatsApp lets
 * a business reply in free text only within 24 hours of the customer's own
 * last message; outside it, nothing but an approved template will send. That
 * rule is invisible in the data — it is a clock running from one row — so
 * every screen that offers a reply box has to ask about it first, or it will
 * offer a box whose contents Meta silently refuses.
 */

import { getSupabaseAdmin } from '@/lib/supabase';

/** Meta's customer service window. */
export const WINDOW_HOURS = 24;

export interface ConversationMessage {
  id: string;
  direction: 'in' | 'out';
  body: string | null;
  occurredAt: string;
  /** `message_sent`, `message_received`, `message_failed`, `unsubscribed`. */
  type: string;
  /** The template used, for an outbound template send. */
  templateName: string | null;
  /** Meta's delivery state, once a receipt has arrived. */
  deliveryStatus: string | null;
  /** True for the automatic reply rather than something a person wrote. */
  automatic: boolean;
  actorName: string | null;
}

export interface WindowState {
  /** Free text may be sent right now. */
  open: boolean;
  /** When the window shuts, or null when no inbound message has ever arrived. */
  expiresAt: string | null;
  lastInboundAt: string | null;
}

export interface ConversationSummary {
  leadId: string;
  name: string;
  phoneE164: string | null;
  lastMessage: string | null;
  lastAt: string;
  lastDirection: 'in' | 'out';
  /** Their message is the most recent one, so nobody has answered it. */
  awaitingReply: boolean;
  window: WindowState;
}

const MESSAGE_TYPES = ['message_sent', 'message_received', 'message_failed'];

function metadataOf(row: { metadata?: unknown }): Record<string, unknown> {
  return row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : {};
}

function windowFrom(lastInboundAt: string | null): WindowState {
  if (!lastInboundAt) return { open: false, expiresAt: null, lastInboundAt: null };
  const expires = new Date(new Date(lastInboundAt).getTime() + WINDOW_HOURS * 3_600_000);
  return { open: expires.getTime() > Date.now(), expiresAt: expires.toISOString(), lastInboundAt };
}

/** Whether free text may be sent to this lead right now. */
export async function windowStateFor(leadId: string): Promise<WindowState> {
  const { data } = await getSupabaseAdmin()
    .from('lead_activities')
    .select('occurred_at')
    .eq('lead_id', leadId)
    .eq('channel', 'whatsapp')
    .eq('direction', 'in')
    .order('occurred_at', { ascending: false })
    .limit(1);
  const last = Array.isArray(data) && data.length > 0 ? (data[0].occurred_at as string) : null;
  return windowFrom(last);
}

/** One lead's WhatsApp thread, oldest first. */
export async function loadThread(leadId: string, limit = 200): Promise<ConversationMessage[]> {
  const { data } = await getSupabaseAdmin()
    .from('lead_activities')
    .select('id, type, direction, body, occurred_at, metadata, actor_name, subject')
    .eq('lead_id', leadId)
    .eq('channel', 'whatsapp')
    .order('occurred_at', { ascending: false })
    .limit(limit);

  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((row): ConversationMessage => {
      const meta = metadataOf(row);
      return {
        id: String(row.id),
        direction: row.direction === 'in' ? 'in' : 'out',
        body: (row.body as string | null) ?? null,
        occurredAt: String(row.occurred_at),
        type: String(row.type),
        templateName: typeof meta.template === 'string' ? meta.template : (row.subject as string | null) ?? null,
        deliveryStatus: typeof meta.deliveryStatus === 'string' ? meta.deliveryStatus : null,
        automatic: meta.automatic === true,
        actorName: (row.actor_name as string | null) ?? null,
      };
    })
    .reverse();
}

/**
 * Every lead with WhatsApp history, most recently active first.
 *
 * Two queries rather than one per lead: the activity rows carry everything but
 * the person's name, so the leads are fetched in a single follow-up rather
 * than N of them.
 */
export async function listConversations(limit = 50): Promise<ConversationSummary[]> {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from('lead_activities')
    .select('lead_id, direction, body, occurred_at, type')
    .eq('channel', 'whatsapp')
    .in('type', MESSAGE_TYPES)
    .order('occurred_at', { ascending: false })
    .limit(limit * 20);

  const rows = Array.isArray(data) ? data : [];

  // Newest first, so the first row seen for a lead is its latest message and
  // the first inbound one is what the window runs from.
  const latest = new Map<string, (typeof rows)[number]>();
  const lastInbound = new Map<string, string>();
  for (const row of rows) {
    const leadId = String(row.lead_id);
    if (!latest.has(leadId)) latest.set(leadId, row);
    if (row.direction === 'in' && !lastInbound.has(leadId)) lastInbound.set(leadId, String(row.occurred_at));
  }

  const leadIds = [...latest.keys()].slice(0, limit);
  if (leadIds.length === 0) return [];

  const { data: leadRows } = await supabase.from('leads').select('id, name, phone_e164').in('id', leadIds);
  const leads = new Map((Array.isArray(leadRows) ? leadRows : []).map((l) => [String(l.id), l]));

  return leadIds
    .map((leadId) => {
      const row = latest.get(leadId)!;
      const lead = leads.get(leadId);
      const direction = row.direction === 'in' ? 'in' : 'out';
      return {
        leadId,
        name: (lead?.name as string | undefined) ?? 'Unknown',
        phoneE164: (lead?.phone_e164 as string | null | undefined) ?? null,
        lastMessage: (row.body as string | null) ?? null,
        lastAt: String(row.occurred_at),
        lastDirection: direction as 'in' | 'out',
        awaitingReply: direction === 'in',
        window: windowFrom(lastInbound.get(leadId) ?? null),
      };
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}
