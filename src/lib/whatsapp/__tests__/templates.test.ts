import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { leadRow } from '@/test-utils/lead-row';
import { __resetTemplateCache, buildTemplateSend, findTemplate, listApprovedTemplates } from '../templates';

const APPROVED = {
  name: 'enquiry_first_touch',
  language: 'en',
  category: 'MARKETING',
  status: 'APPROVED',
  components: [
    { type: 'BODY', text: 'Hi {{1}}, thanks for your enquiry about {{2}}.\n\nI am {{3}} and I will look after it.' },
    { type: 'FOOTER', text: 'Reply STOP to opt out' },
  ],
};

const REJECTED = { name: 'never_shipped', language: 'en', category: 'UTILITY', status: 'REJECTED', components: [] };
const PAUSED = { name: 'paused_one', language: 'en', category: 'MARKETING', status: 'PAUSED', components: [] };

function mockGraph(templates: unknown[], ok = true) {
  const spy = vi.fn().mockResolvedValue({ ok, json: async () => ({ data: templates }) });
  vi.stubGlobal('fetch', spy);
  return spy;
}

beforeEach(() => {
  __resetTemplateCache();
  vi.stubEnv('WHATSAPP_TOKEN', 'test-token');
  vi.stubEnv('WHATSAPP_WABA_ID', 'waba-1');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('listApprovedTemplates', () => {
  it('returns only the approved ones', async () => {
    // A rejected or paused template still appears in Meta's list, and offering
    // one would produce a send that fails for no visible reason.
    mockGraph([APPROVED, REJECTED, PAUSED]);
    const templates = await listApprovedTemplates();
    expect(templates.map((t) => t.name)).toEqual(['enquiry_first_touch']);
  });

  it('counts the distinct placeholders in the body', async () => {
    mockGraph([APPROVED]);
    expect((await listApprovedTemplates())[0].variables).toBe(3);
  });

  it('keeps the body text so a person can see what they are about to send', async () => {
    mockGraph([APPROVED]);
    expect((await listApprovedTemplates())[0].body).toContain('thanks for your enquiry about {{2}}');
  });

  it('carries the token in the header, never in the URL', async () => {
    const spy = mockGraph([APPROVED]);
    await listApprovedTemplates();
    expect(spy.mock.calls[0][0]).not.toContain('test-token');
    expect(spy.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token');
  });

  it('caches, so opening the inbox is not one Graph call per render', async () => {
    const spy = mockGraph([APPROVED]);
    await listApprovedTemplates();
    await listApprovedTemplates();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('returns the last known list when Meta blips rather than emptying the picker', async () => {
    mockGraph([APPROVED]);
    await listApprovedTemplates();
    __resetTemplateCache();

    // Cache cleared, so this one really does go out and fail.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    expect(await listApprovedTemplates()).toEqual([]);
  });

  it('is empty without credentials, without calling anything', async () => {
    vi.stubEnv('WHATSAPP_TOKEN', '');
    const spy = mockGraph([APPROVED]);
    expect(await listApprovedTemplates()).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('findTemplate', () => {
  it('finds an approved template by name', async () => {
    mockGraph([APPROVED]);
    expect((await findTemplate('enquiry_first_touch'))?.language).toBe('en');
  });

  it('refuses one that is not approved', async () => {
    mockGraph([APPROVED, REJECTED]);
    expect(await findTemplate('never_shipped')).toBeNull();
  });
});

describe('buildTemplateSend', () => {
  const template = { name: 'enquiry_first_touch', language: 'en', category: 'MARKETING', body: '', variables: 3 };

  it('fills exactly as many parameters as the template declares', () => {
    const send = buildTemplateSend({ ...template, variables: 2 }, leadRow(), 'Asha Rao');
    expect(send.bodyParams).toHaveLength(2);
  });

  it('puts person, subject and sender in that order', () => {
    const lead = leadRow({ name: 'Priya Shah', custom_fields: { service: 'SEO' } });
    expect(buildTemplateSend(template, lead, 'Asha Rao').bodyParams).toEqual(['Priya', 'SEO', 'Asha Rao']);
  });

  it('never leaves a parameter empty, which Cloud API rejects outright', () => {
    const lead = leadRow({ name: '', custom_fields: {}, project_type: null });
    const params = buildTemplateSend(template, lead, '').bodyParams ?? [];
    expect(params.every((p) => p.trim().length > 0)).toBe(true);
  });

  it('fills a template with more placeholders than we have values for', () => {
    const params = buildTemplateSend({ ...template, variables: 5 }, leadRow(), 'Asha').bodyParams ?? [];
    expect(params).toHaveLength(5);
    expect(params.every((p) => p.trim().length > 0)).toBe(true);
  });

  it('carries the template’s own language, not a guess', () => {
    const send = buildTemplateSend({ ...template, language: 'en_US' }, leadRow(), 'Asha');
    expect(send.language).toBe('en_US');
  });
});
