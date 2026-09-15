import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eqValue, fake, payloadOf } from '@/test-utils/fake-supabase';
import { leadRow } from '@/test-utils/lead-row';

const mocks = vi.hoisted(() => ({
  send: vi.fn(async (_event: unknown) => undefined),
  ingestLead: vi.fn(async (_lead: unknown) => ({ leadId: 'lead_new', created: true })),
}));

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: mocks.send } }));
vi.mock('@/lib/events/emitter', () => ({ emitEvent: vi.fn(async () => undefined) }));
vi.mock('@/lib/sales/intake/ingest', () => ({ ingestLead: mocks.ingestLead }));

import { handleCalcomEvent, parseCalcomBooking } from '../meetings';

const booking = (trigger: string, overrides: Record<string, unknown> = {}) => ({
  triggerEvent: trigger,
  createdAt: '2026-09-15T06:00:00.000Z',
  payload: {
    uid: 'bk_1',
    title: '15 Min Meeting between Asha and Priya Shah',
    startTime: '2026-09-16T05:30:00.000Z',
    endTime: '2026-09-16T05:45:00.000Z',
    attendees: [{ name: 'Priya Shah', email: 'priya@example.com', timeZone: 'Asia/Kolkata' }],
    responses: { notes: { value: 'Want to talk about SEO' } },
    metadata: { leadId: 'lead_1', videoCallUrl: 'https://app.cal.com/video/bk_1' },
    ...overrides,
  },
});

function sentEvents(name: string) {
  return mocks.send.mock.calls
    .map(([event]) => event)
    .filter((event): event is { name: string; data: Record<string, unknown> } =>
      typeof event === 'object' && event !== null && 'name' in event && event.name === name
    );
}

beforeEach(() => {
  fake.reset();
  mocks.send.mockClear();
  mocks.ingestLead.mockClear();
});

describe('parseCalcomBooking', () => {
  it('extracts the attendee, lead hint and meeting link', () => {
    expect(parseCalcomBooking(booking('BOOKING_CREATED'))).toMatchObject({
      trigger: 'BOOKING_CREATED',
      uid: 'bk_1',
      attendeeEmail: 'priya@example.com',
      attendeeName: 'Priya Shah',
      leadIdHint: 'lead_1',
      meetingUrl: 'https://app.cal.com/video/bk_1',
      notes: 'Want to talk about SEO',
    });
  });

  it('ignores Cal.com ping events', () => {
    expect(parseCalcomBooking({ triggerEvent: 'PING', payload: {} })).toBeNull();
  });
});

describe('handleCalcomEvent', () => {
  it('BOOKING_CREATED saves the meeting, stops the sequence, moves the stage and queues prep', async () => {
    fake.respond((call) => {
      if (call.table === 'leads' && call.op === 'select' && call.single && eqValue(call, 'id') === 'lead_1') {
        return { data: leadRow({ status: 'contacted', sequence_status: 'active' }), error: null };
      }
      if (call.table === 'leads' && call.op === 'select') return { data: { status: 'contacted' }, error: null };
      if (call.table === 'leads' && call.op === 'update' && eqValue(call, 'sequence_status') === 'active') {
        return { data: [{ id: 'lead_1' }], error: null };
      }
      return { data: null, error: null };
    });

    await handleCalcomEvent(booking('BOOKING_CREATED'));

    expect(payloadOf(fake.callsTo('meetings', 'upsert')[0])).toMatchObject({ lead_id: 'lead_1', external_uid: 'bk_1', status: 'booked' });
    expect(sentEvents('sales/sequence.stop')[0]?.data).toEqual({ leadId: 'lead_1', reason: 'booked' });
    expect(fake.callsTo('leads', 'update').map(payloadOf).some((p) => p.status === 'discovery_scheduled')).toBe(true);
    expect(sentEvents('sales/meeting.booked')[0]?.data).toMatchObject({ leadId: 'lead_1' });
    expect(mocks.ingestLead).not.toHaveBeenCalled();
  });

  it('BOOKING_CREATED from a stranger creates the lead through intake', async () => {
    fake.respond((call) => {
      if (call.table === 'leads' && call.op === 'select' && call.single && eqValue(call, 'id') === 'lead_new') {
        return { data: leadRow({ id: 'lead_new', status: 'new', source: 'cal_booking' }), error: null };
      }
      if (call.table === 'leads' && call.op === 'select' && call.single) return { data: null, error: null };
      if (call.table === 'leads' && call.op === 'select') return { data: { status: 'new' }, error: null };
      return { data: null, error: null };
    });

    await handleCalcomEvent(booking('BOOKING_CREATED', { metadata: {} }));

    expect(mocks.ingestLead).toHaveBeenCalledWith(expect.objectContaining({ source: 'cal_booking', email: 'priya@example.com' }));
    expect(payloadOf(fake.callsTo('meetings', 'upsert')[0])).toMatchObject({ lead_id: 'lead_new' });
  });

  it('BOOKING_CANCELLED cancels the meeting and asks the owner to rebook', async () => {
    fake.respond((call) => {
      if (call.table === 'meetings' && call.op === 'select') {
        return { data: { id: 'meet_1', lead_id: 'lead_1', owner_id: 'user-1', status: 'booked' }, error: null };
      }
      if (call.table === 'leads' && call.op === 'select') return { data: leadRow(), error: null };
      return { data: null, error: null };
    });

    await handleCalcomEvent(booking('BOOKING_CANCELLED'));

    expect(fake.callsTo('meetings', 'update').map(payloadOf)[0]).toMatchObject({ status: 'cancelled' });
    expect(sentEvents('sales/meeting.cancelled')[0]?.data).toEqual({ meetingId: 'meet_1', leadId: 'lead_1' });
    expect(fake.callsTo('sales_tasks', 'insert').map(payloadOf)[0]).toMatchObject({ title: 'Rebook the discovery call' });
  });

  it('MEETING_ENDED completes the meeting and creates the notes task', async () => {
    fake.respond((call) => {
      if (call.table === 'meetings' && call.op === 'select') {
        return { data: { id: 'meet_1', lead_id: 'lead_1', owner_id: 'user-1', status: 'booked' }, error: null };
      }
      if (call.table === 'leads' && call.op === 'select' && call.single && eqValue(call, 'id') === 'lead_1' && call.filters.length === 1) {
        return { data: leadRow({ status: 'discovery_scheduled' }), error: null };
      }
      if (call.table === 'leads' && call.op === 'select') return { data: { status: 'discovery_scheduled' }, error: null };
      if (call.table === 'sales_tasks' && call.op === 'select') return { data: [], error: null };
      return { data: null, error: null };
    });

    await handleCalcomEvent(booking('MEETING_ENDED'));

    expect(fake.callsTo('meetings', 'update').map(payloadOf)[0]).toMatchObject({ status: 'completed' });
    expect(fake.callsTo('sales_tasks', 'insert').map(payloadOf)[0]).toMatchObject({ title: 'Log discovery notes' });
  });
});
