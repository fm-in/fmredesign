import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { leadRow } from '@/test-utils/lead-row';

const sendWhatsAppTemplate = vi.fn().mockResolvedValue({ ok: true, wamid: 'wamid.OUT' });
const isWhatsAppConfigured = vi.fn().mockReturnValue(true);
vi.mock('@/lib/whatsapp/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/whatsapp/client')>('@/lib/whatsapp/client');
  return {
    ...actual,
    isWhatsAppConfigured: () => isWhatsAppConfigured(),
    sendWhatsAppTemplate: (...a: unknown[]) => sendWhatsAppTemplate(...a),
  };
});

const isSuppressed = vi.fn().mockResolvedValue(false);
vi.mock('@/lib/sales/suppression', () => ({ isSuppressed: (...a: unknown[]) => isSuppressed(...a) }));

const getSalesSettings = vi.fn().mockResolvedValue({ automationEnabled: true });
vi.mock('@/lib/sales/settings', () => ({ getSalesSettings: () => getSalesSettings() }));

const recordActivity = vi.fn().mockResolvedValue('act_1');
vi.mock('@/lib/sales/activity', () => ({ recordActivity: (...a: unknown[]) => recordActivity(...a) }));

import { enquiryFirstTouch, sendTemplateToLead } from '../send';

const TEMPLATE = { name: 'enquiry_first_touch', language: 'en', bodyParams: ['Priya', 'SEO', 'Asha'] };

/** 14:00 IST — inside the 09:00–19:00 window. */
const INSIDE_HOURS = new Date('2026-09-20T08:30:00Z');
/** 02:00 IST — outside it. */
const OUTSIDE_HOURS = new Date('2026-09-20T20:30:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers().setSystemTime(INSIDE_HOURS);
  isWhatsAppConfigured.mockReturnValue(true);
  isSuppressed.mockResolvedValue(false);
  getSalesSettings.mockResolvedValue({ automationEnabled: true });
  sendWhatsAppTemplate.mockResolvedValue({ ok: true, wamid: 'wamid.OUT' });
});

afterEach(() => vi.useRealTimers());

describe('sendTemplateToLead, marketing', () => {
  it('sends and writes the outbound activity', async () => {
    const result = await sendTemplateToLead({ lead: leadRow(), template: TEMPLATE, category: 'marketing' });

    expect(result).toEqual({ sent: true, wamid: 'wamid.OUT' });
    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'message_sent',
        channel: 'whatsapp',
        direction: 'out',
        subject: 'enquiry_first_touch',
        providerMessageId: 'wamid.OUT',
      })
    );
  });

  it('refuses without a phone number, before anything else is checked', async () => {
    const result = await sendTemplateToLead({
      lead: leadRow({ phone_e164: null }),
      template: TEMPLATE,
      category: 'marketing',
    });
    expect(result).toEqual({ sent: false, reason: 'no_phone' });
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled();
  });

  it('refuses without a consent basis', async () => {
    const result = await sendTemplateToLead({
      lead: leadRow({ consent_basis: 'none' }),
      template: TEMPLATE,
      category: 'marketing',
    });
    expect(result).toEqual({ sent: false, reason: 'no_consent' });
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled();
  });

  it('refuses while automation is switched off', async () => {
    getSalesSettings.mockResolvedValue({ automationEnabled: false });
    const result = await sendTemplateToLead({ lead: leadRow(), template: TEMPLATE, category: 'marketing' });
    expect(result).toEqual({ sent: false, reason: 'automation_off' });
  });

  it('refuses outside sending hours', async () => {
    vi.setSystemTime(OUTSIDE_HOURS);
    const result = await sendTemplateToLead({ lead: leadRow(), template: TEMPLATE, category: 'marketing' });
    expect(result).toEqual({ sent: false, reason: 'outside_hours' });
  });

  it('sends outside hours when it answers something the person just did', async () => {
    // Someone filling a form at 02:00 is awake and waiting.
    vi.setSystemTime(OUTSIDE_HOURS);
    const result = await sendTemplateToLead({
      lead: leadRow(),
      template: TEMPLATE,
      category: 'marketing',
      respondingToAction: true,
    });
    expect(result).toMatchObject({ sent: true });
  });

  it('asks the do-not-contact list about WhatsApp specifically', async () => {
    await sendTemplateToLead({ lead: leadRow(), template: TEMPLATE, category: 'marketing' });
    expect(isSuppressed).toHaveBeenCalledWith({ phoneE164: '+919833257659' }, 'whatsapp');
  });

  it('refuses when suppressed, even while answering an action', async () => {
    isSuppressed.mockResolvedValue(true);
    const result = await sendTemplateToLead({
      lead: leadRow(),
      template: TEMPLATE,
      category: 'marketing',
      respondingToAction: true,
    });
    expect(result).toEqual({ sent: false, reason: 'suppressed' });
  });

  it('records a failure rather than swallowing it', async () => {
    sendWhatsAppTemplate.mockResolvedValue({ ok: false, error: 'Template name does not exist' });
    const result = await sendTemplateToLead({ lead: leadRow(), template: TEMPLATE, category: 'marketing' });

    expect(result).toEqual({ sent: false, reason: 'failed', error: 'Template name does not exist' });
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ type: 'message_failed' }));
  });

  it('refuses when WhatsApp is not configured', async () => {
    isWhatsAppConfigured.mockReturnValue(false);
    const result = await sendTemplateToLead({ lead: leadRow(), template: TEMPLATE, category: 'marketing' });
    expect(result).toEqual({ sent: false, reason: 'not_configured' });
  });
});

describe('sendTemplateToLead, utility', () => {
  it('ignores consent, hours and the automation switch', async () => {
    // A utility template is an update on something already under way — a paid
    // enrolment, an invoice — so none of the marketing gates apply.
    vi.setSystemTime(OUTSIDE_HOURS);
    getSalesSettings.mockResolvedValue({ automationEnabled: false });

    const result = await sendTemplateToLead({
      lead: leadRow({ consent_basis: 'none' }),
      template: { name: 'academy_payment_confirmed', language: 'en' },
      category: 'utility',
    });

    expect(result).toMatchObject({ sent: true });
  });

  it('still respects a hard opt-out', async () => {
    isSuppressed.mockResolvedValue(true);
    const result = await sendTemplateToLead({
      lead: leadRow(),
      template: { name: 'academy_payment_confirmed', language: 'en' },
      category: 'utility',
    });
    expect(result).toEqual({ sent: false, reason: 'suppressed' });
  });
});

describe('enquiryFirstTouch', () => {
  it('uses the approved name and language exactly', () => {
    const template = enquiryFirstTouch(leadRow(), 'Asha Rao');
    expect(template.name).toBe('enquiry_first_touch');
    // `en_US` is a different template and would fail at send time.
    expect(template.language).toBe('en');
  });

  it('fills first name, subject and owner in that order', () => {
    const lead = leadRow({ name: 'Priya Shah', custom_fields: { service: 'Social Media' } });
    expect(enquiryFirstTouch(lead, 'Asha Rao').bodyParams).toEqual(['Priya', 'social media marketing', 'Asha Rao']);
  });

  it('never leaves a parameter empty, which Cloud API rejects outright', () => {
    // An ad lead has no service and may have no usable name.
    const lead = leadRow({ name: '', custom_fields: {}, project_type: null });
    const params = enquiryFirstTouch(lead, '').bodyParams ?? [];
    expect(params).toEqual(['there', 'your project', 'the Freaking Minds team']);
    expect(params.every((value) => value.trim().length > 0)).toBe(true);
  });

  it('falls back to the project type when no service was chosen', () => {
    const lead = leadRow({ custom_fields: {}, project_type: 'web_development' });
    expect(enquiryFirstTouch(lead, 'Asha').bodyParams?.[1]).toBe('web development');
  });
});
