import { describe, it, expect, vi, beforeEach } from 'vitest';
import { leadRow } from '@/test-utils/lead-row';

const mocks = vi.hoisted(() => ({
  getDefaultConfig: vi.fn(() => ({ provider: 'anthropic', model: 'test-model', apiKey: 'k' })),
  generateJSON: vi.fn(async (_messages: unknown, _config: unknown): Promise<unknown> => ({ brief: 'AI brief', draft: 'AI draft' })),
}));

vi.mock('@/lib/ai/providers', () => ({
  getDefaultConfig: mocks.getDefaultConfig,
  createProvider: () => ({ generateJSON: mocks.generateJSON, generate: vi.fn() }),
}));

import { buildBriefMessages, fallbackFirstTouchDraft, generateLeadBrief } from '../brief';
import { TEAM_SIGNATURE } from '../emails';

beforeEach(() => {
  mocks.getDefaultConfig.mockClear();
  mocks.generateJSON.mockClear();
});

describe('generateLeadBrief', () => {
  it('uses the AI result when it is well formed', async () => {
    await expect(generateLeadBrief(leadRow(), 'Asha')).resolves.toEqual({ brief: 'AI brief', draft: 'AI draft', aiGenerated: true });
  });

  it('falls back to templates when no provider is configured', async () => {
    mocks.getDefaultConfig.mockImplementationOnce(() => {
      throw new Error('No API key configured');
    });
    const result = await generateLeadBrief(leadRow(), 'Asha');
    expect(result.aiGenerated).toBe(false);
    expect(result.brief).toContain('Priya Shah');
    expect(result.draft).toContain('Asha');
  });

  it('falls back when the AI returns the wrong shape', async () => {
    mocks.generateJSON.mockResolvedValueOnce({ summary: 'nope' });
    await expect(generateLeadBrief(leadRow(), 'Asha')).resolves.toMatchObject({ aiGenerated: false });
  });
});

describe('prompt and drafts', () => {
  it('gives the model the lead facts and the sender', () => {
    const [system, user] = buildBriefMessages(leadRow({ company: 'Acme' }), 'Asha');
    expect(system.role).toBe('system');
    expect(user.content).toContain('Acme');
    expect(user.content).toContain('Asha');
  });

  it('signs a team draft without a person name', () => {
    expect(fallbackFirstTouchDraft(leadRow(), TEAM_SIGNATURE)).toContain('the FreakingMinds team');
  });
});
