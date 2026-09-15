/**
 * Cal.com bookings become meetings on the lead, move the stage and stop the
 * follow-up sequence. Payload reference:
 * https://cal.com/docs/developing/guides/automation/webhooks
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email/send';
import { createNotification, notifyAdmins } from '@/lib/notifications';
import { SITE_URL } from '@/lib/site-url';
import { changeStage, recordActivity, stopSequence } from '@/lib/sales/activity';
import { generateMeetingBrief } from '@/lib/sales/brief';
import { escapeHtml } from '@/lib/sales/emails';
import { WebhookRejection } from '@/lib/sales/errors';
import { sendSalesEvent } from '@/lib/sales/events';
import { isRecord, readString } from '@/lib/sales/intake/adapters/verify';
import { ingestLead } from '@/lib/sales/intake/ingest';
import { normaliseEmail } from '@/lib/sales/intake/normalise';
import { loadLead, loadOwner } from '@/lib/sales/lead-store';
import { createTask, hasOpenTask } from '@/lib/sales/tasks';
import { generateSalesId, SYSTEM_ACTOR } from '@/lib/sales/types';
import type { Actor, LeadRow, MeetingRow } from '@/lib/sales/types';

export const REBOOK_TITLE = 'Rebook the discovery call';
export const LOG_NOTES_TITLE = 'Log discovery notes';

/** A booking moves a lead into discovery, including one that had gone cold or stale. */
const STAGES_A_BOOKING_ADVANCES = new Set(['new', 'contacted', 'qualified', 'lost', 'archived']);

export interface ParsedBooking {
  trigger: string;
  uid: string;
  previousUid: string | null;
  title: string | null;
  startsAt: string;
  endsAt: string;
  attendeeName?: string;
  attendeeEmail?: string;
  attendeePhone?: string;
  leadIdHint?: string;
  meetingUrl: string | null;
  notes?: string;
  raw: Record<string, unknown>;
}

export function parseCalcomBooking(body: unknown): ParsedBooking | null {
  if (!isRecord(body) || !isRecord(body.payload)) return null;
  const trigger = readString(body, 'triggerEvent');
  const payload = body.payload;
  const uid = readString(payload, 'uid');
  const startsAt = readString(payload, 'startTime');
  const endsAt = readString(payload, 'endTime');
  if (!trigger || !uid || !startsAt || !endsAt) return null;

  const attendee = Array.isArray(payload.attendees) ? payload.attendees.find(isRecord) : undefined;
  const responses = isRecord(payload.responses) ? payload.responses : {};
  const answer = (key: string): string | undefined => {
    const value = responses[key];
    if (isRecord(value)) return readString(value, 'value');
    return typeof value === 'string' ? value : undefined;
  };
  const metadata = isRecord(payload.metadata) ? payload.metadata : {};
  const videoCallData = isRecord(payload.videoCallData) ? payload.videoCallData : {};
  const location = readString(payload, 'location');

  return {
    trigger,
    uid,
    previousUid: readString(payload, 'rescheduleUid') ?? readString(payload, 'fromReschedule') ?? null,
    title: readString(payload, 'title') ?? null,
    startsAt,
    endsAt,
    attendeeName: (attendee ? readString(attendee, 'name') : undefined) ?? answer('name'),
    attendeeEmail: (attendee ? readString(attendee, 'email') : undefined) ?? answer('email'),
    attendeePhone: (attendee ? readString(attendee, 'phoneNumber') : undefined) ?? answer('attendeePhoneNumber'),
    leadIdHint: readString(metadata, 'leadId'),
    meetingUrl:
      readString(metadata, 'videoCallUrl') ??
      readString(videoCallData, 'url') ??
      (location && location.startsWith('http') ? location : null),
    notes: answer('notes'),
    raw: payload,
  };
}

export async function loadMeeting(meetingId: string): Promise<MeetingRow | null> {
  const { data, error } = await getSupabaseAdmin().from('meetings').select('*').eq('id', meetingId).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

async function findMeetingByUid(uid: string): Promise<MeetingRow | null> {
  const { data, error } = await getSupabaseAdmin().from('meetings').select('*').eq('external_uid', uid).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

async function resolveLead(booking: ParsedBooking): Promise<LeadRow> {
  if (booking.leadIdHint) {
    const hinted = await loadLead(booking.leadIdHint);
    if (hinted) return hinted;
  }
  if (!booking.attendeeEmail && !booking.attendeePhone) {
    throw new WebhookRejection('Booking has no attendee email or phone');
  }
  // Intake matches an existing lead by email/phone or creates a new one.
  const { leadId } = await ingestLead({
    name: booking.attendeeName,
    email: booking.attendeeEmail,
    phone: booking.attendeePhone,
    message: booking.notes,
    source: 'cal_booking',
    sourceDetail: booking.title ?? 'Cal.com booking',
    consent: { basis: 'inbound_request', evidence: { platform: 'calcom', bookingUid: booking.uid }, capturedAt: new Date().toISOString() },
  });
  const lead = await loadLead(leadId);
  if (!lead) throw new Error(`Lead ${leadId} vanished after intake`);
  return lead;
}

async function onBooked(booking: ParsedBooking): Promise<void> {
  const lead = await resolveLead(booking);
  const supabase = getSupabaseAdmin();
  const existing = await findMeetingByUid(booking.uid);
  const meetingId = existing?.id ?? generateSalesId('meet');

  const { error } = await supabase.from('meetings').upsert(
    {
      id: meetingId,
      lead_id: lead.id,
      provider: 'calcom',
      external_uid: booking.uid,
      title: booking.title,
      starts_at: booking.startsAt,
      ends_at: booking.endsAt,
      status: 'booked',
      meeting_url: booking.meetingUrl,
      attendee_email: normaliseEmail(booking.attendeeEmail) ?? null,
      owner_id: lead.owner_id,
      raw: booking.raw,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'external_uid' }
  );
  if (error) throw error;

  await stopSequence(lead.id, 'booked');
  if (STAGES_A_BOOKING_ADVANCES.has(lead.status)) {
    await changeStage(lead.id, 'discovery_scheduled', SYSTEM_ACTOR, { reason: 'Booked via Cal.com' });
  }
  await recordActivity({
    leadId: lead.id,
    type: 'meeting_booked',
    channel: 'calcom',
    subject: booking.title,
    metadata: { meetingId, startsAt: booking.startsAt, meetingUrl: booking.meetingUrl },
  });
  await sendSalesEvent({ name: 'sales/meeting.booked', data: { meetingId, leadId: lead.id } });
}

async function onRescheduled(booking: ParsedBooking): Promise<void> {
  const meeting = await findMeetingByUid(booking.previousUid ?? booking.uid);
  if (!meeting) return onBooked(booking);

  const { error } = await getSupabaseAdmin()
    .from('meetings')
    .update({
      external_uid: booking.uid,
      starts_at: booking.startsAt,
      ends_at: booking.endsAt,
      status: 'booked',
      meeting_url: booking.meetingUrl ?? meeting.meeting_url,
      raw: booking.raw,
      updated_at: new Date().toISOString(),
    })
    .eq('id', meeting.id);
  if (error) throw error;

  await recordActivity({
    leadId: meeting.lead_id,
    type: 'meeting_rescheduled',
    channel: 'calcom',
    subject: booking.title,
    metadata: { meetingId: meeting.id, startsAt: booking.startsAt },
  });
  // Cancel the prep scheduled for the old time, then schedule it for the new one.
  await sendSalesEvent({ name: 'sales/meeting.cancelled', data: { meetingId: meeting.id, leadId: meeting.lead_id } });
  await sendSalesEvent({ name: 'sales/meeting.booked', data: { meetingId: meeting.id, leadId: meeting.lead_id } });
}

async function onCancelled(booking: ParsedBooking): Promise<void> {
  const meeting = await findMeetingByUid(booking.uid);
  if (!meeting) return;

  const { error } = await getSupabaseAdmin()
    .from('meetings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', meeting.id);
  if (error) throw error;

  await recordActivity({ leadId: meeting.lead_id, type: 'meeting_cancelled', channel: 'calcom', subject: booking.title, metadata: { meetingId: meeting.id } });
  await sendSalesEvent({ name: 'sales/meeting.cancelled', data: { meetingId: meeting.id, leadId: meeting.lead_id } });

  if (await hasOpenTask(meeting.lead_id, REBOOK_TITLE)) return;
  const lead = await loadLead(meeting.lead_id);
  await createTask({
    leadId: meeting.lead_id,
    ownerId: lead?.owner_id ?? meeting.owner_id,
    type: 'call',
    title: REBOOK_TITLE,
    dueAt: new Date().toISOString(),
  });
}

async function ensureNotesTask(leadId: string, fallbackOwnerId: string | null): Promise<void> {
  if (await hasOpenTask(leadId, LOG_NOTES_TITLE)) return;
  const lead = await loadLead(leadId);
  await createTask({
    leadId,
    ownerId: lead?.owner_id ?? fallbackOwnerId,
    type: 'custom',
    title: LOG_NOTES_TITLE,
    draftBody: `Record what you learned in a discovery session: ${SITE_URL}/admin/discovery/new?leadId=${encodeURIComponent(leadId)}`,
    dueAt: new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
  });
}

export async function completeMeeting(meetingId: string, actor: Actor = SYSTEM_ACTOR): Promise<void> {
  const meeting = await loadMeeting(meetingId);
  if (!meeting || meeting.status === 'cancelled') return;
  // A webhook replay must not overwrite a no-show a person recorded; a person may still correct one.
  if (meeting.status === 'no_show' && actor.id === SYSTEM_ACTOR.id) return;

  if (meeting.status !== 'completed') {
    const { error } = await getSupabaseAdmin()
      .from('meetings')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', meetingId);
    if (error) throw error;

    await recordActivity({ leadId: meeting.lead_id, type: 'meeting_completed', actor, metadata: { meetingId } });
    const lead = await loadLead(meeting.lead_id);
    if (lead?.status === 'discovery_scheduled') {
      await changeStage(lead.id, 'discovery_completed', actor, { reason: 'Discovery call held' });
    }
  }
  await ensureNotesTask(meeting.lead_id, meeting.owner_id);
}

export async function markNoShow(meetingId: string, actor: Actor): Promise<void> {
  const meeting = await loadMeeting(meetingId);
  if (!meeting || meeting.status === 'cancelled') return;
  const { error } = await getSupabaseAdmin()
    .from('meetings')
    .update({ status: 'no_show', updated_at: new Date().toISOString() })
    .eq('id', meetingId);
  if (error) throw error;
  await recordActivity({ leadId: meeting.lead_id, type: 'meeting_completed', actor, metadata: { meetingId, noShow: true } });
  if (await hasOpenTask(meeting.lead_id, REBOOK_TITLE)) return;
  await createTask({ leadId: meeting.lead_id, ownerId: meeting.owner_id, type: 'call', title: REBOOK_TITLE, dueAt: new Date().toISOString(), createdBy: actor });
}

async function onEnded(booking: ParsedBooking): Promise<void> {
  const meeting = await findMeetingByUid(booking.uid);
  if (meeting) await completeMeeting(meeting.id);
}

export async function handleCalcomEvent(body: unknown): Promise<void> {
  const booking = parseCalcomBooking(body);
  if (!booking) return; // PING and unsupported shapes

  switch (booking.trigger) {
    case 'BOOKING_CREATED':
      return onBooked(booking);
    case 'BOOKING_RESCHEDULED':
      return onRescheduled(booking);
    case 'BOOKING_CANCELLED':
      return onCancelled(booking);
    case 'MEETING_ENDED':
      return onEnded(booking);
    default:
      return;
  }
}

/** Two hours before the call: an AI brief to the owner, in-app and by email. */
export async function sendMeetingBrief(meetingId: string): Promise<void> {
  const meeting = await loadMeeting(meetingId);
  if (!meeting || meeting.status !== 'booked') return;
  const lead = await loadLead(meeting.lead_id);
  if (!lead) return;

  const { data: activities } = await getSupabaseAdmin()
    .from('lead_activities')
    .select('*')
    .eq('lead_id', lead.id)
    .order('occurred_at', { ascending: false })
    .limit(30);

  const brief = await generateMeetingBrief(lead, meeting, Array.isArray(activities) ? activities : []);
  await recordActivity({ leadId: lead.id, type: 'ai_brief', subject: 'Pre-call brief', body: brief, metadata: { meetingId } });

  const owner = await loadOwner(lead.owner_id);
  const notification = {
    type: 'general' as const,
    title: `Call with ${lead.name} in 2 hours`,
    message: brief.split('\n')[0] ?? '',
    priority: 'high' as const,
    actionUrl: `/admin/leads/${lead.id}`,
  };
  if (owner) await createNotification({ recipientType: 'admin', recipientId: owner.id, ...notification });
  else await notifyAdmins(notification);

  const to = owner?.email ?? process.env.NOTIFICATION_EMAIL;
  if (to) {
    await sendEmail({
      to,
      subject: `Pre-call brief: ${lead.name}`,
      html: `<pre style="font-family:inherit;white-space:pre-wrap;font-size:15px;line-height:1.6">${escapeHtml(brief)}</pre><p><a href="${SITE_URL}/admin/leads/${encodeURIComponent(lead.id)}">Open the lead</a></p>`,
    });
  }
}

/** Thirty minutes after the call, make sure the notes task exists. */
export async function createPostMeetingTask(meetingId: string): Promise<void> {
  const meeting = await loadMeeting(meetingId);
  if (!meeting || meeting.status === 'cancelled' || meeting.status === 'no_show') return;
  await ensureNotesTask(meeting.lead_id, meeting.owner_id);
}
