/**
 * POST /api/admin/scorecard convert: failures are logged by code and a blanked
 * message only. The lead is written by the real `ingestLead`; the database
 * error it throws quotes the row, as Postgres does.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fake } from '@/test-utils/fake-supabase';
import { QUESTIONS } from '@/lib/scorecard/questions';
import { scoreScorecard } from '@/lib/scorecard/scoring';

vi.mock('@/lib/supabase', async () => {
  const m = await import('@/test-utils/fake-supabase');
  return { getSupabaseAdmin: () => m.fake.client };
});
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: vi.fn(async () => undefined) } }));
vi.mock('@/lib/events/emitter', () => ({ emitEvent: vi.fn(async () => undefined) }));
vi.mock('@/lib/admin-auth-middleware', () => ({
  requirePermission: vi.fn(async () => ({
    user: { id: 'u-admin', name: 'Asha', role: 'admin', permissions: ['sales.read', 'sales.write'] },
  })),
}));

import { POST } from '../route';

const EMAIL = 'karan@mehtafoods.example';
const PHONE = '+91 99001 12233';

/** The row `POST /api/scorecard` stores for a complete submission. */
function submission(): Record<string, unknown> {
  const answers = Object.fromEntries(QUESTIONS.map((q) => [q.id, q.options.find((o) => o.score === 1)?.value ?? '']));
  const result = scoreScorecard(answers);
  return {
    id: 'sc_mfk2a9_x1y2z',
    name: 'Karan Mehta',
    email: EMAIL,
    company: 'Mehta Foods',
    phone: PHONE,
    answers,
    overall_score: result.overall,
    band: result.band,
    dimension_scores: result.dimensions,
    status: 'new',
    lead_id: null,
    ip_address: null,
    user_agent: null,
    created_at: '2026-09-15T04:00:00.000Z',
  };
}

let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fake.reset();
  error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/admin/scorecard convert', () => {
  it('logs a failed lead intake by code, without the address or phone', async () => {
    const rowQuotingError = Object.assign(
      { code: '23514', message: `new row for ${EMAIL} violates check constraint "leads_source_check"` },
      { details: `Failing row contains (lead_x, Karan Mehta, ${EMAIL}, ${PHONE}, +919900112233).` }
    );
    fake.respond((call) => {
      if (call.table === 'scorecard_submissions' && call.op === 'select') return { data: submission(), error: null };
      if (call.table === 'leads' && call.op === 'select') return { data: [], error: null };
      if (call.table === 'leads' && call.op === 'insert') return { data: null, error: rowQuotingError };
      return { data: null, error: null };
    });

    const res = await POST(
      new NextRequest('http://localhost/api/admin/scorecard', {
        method: 'POST',
        body: JSON.stringify({ action: 'convert', id: 'sc_mfk2a9_x1y2z' }),
      })
    );

    expect(res.status).toBe(500);
    const logged = JSON.stringify(error.mock.calls);
    expect(logged).toContain('lead intake failed');
    expect(logged).toContain('23514');
    expect(logged).not.toContain(EMAIL);
    expect(logged.replace(/\D/g, '')).not.toContain('9900112233');
  });
});
