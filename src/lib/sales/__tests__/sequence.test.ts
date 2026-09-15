import { describe, it, expect } from 'vitest';
import { INBOUND_V1, shouldContinue, type ContinueState } from '../sequence';

const DAYS: Record<string, number> = { '0s': 0, '2d': 2 };

describe('INBOUND_V1', () => {
  it('emails on day 0, 2 and 6 with a call task on day 4', () => {
    let day = 0;
    const schedule = INBOUND_V1.map((step) => {
      day += DAYS[step.waitBefore];
      return `${day}:${step.kind === 'email' ? step.template : step.taskType}`;
    });
    expect(schedule).toEqual(['0:instant_reply', '2:follow_up_proof', '4:call', '6:close_the_loop']);
  });
});

describe('shouldContinue', () => {
  const base: ContinueState = {
    automationEnabled: true,
    suppressed: false,
    hasBookedMeeting: false,
    status: 'contacted',
    sequenceStatus: 'active',
  };

  it('continues for an active, untouched lead', () => {
    expect(shouldContinue(base)).toEqual({ ok: true });
  });

  it.each([
    [{ sequenceStatus: 'stopped' }, 'manual'],
    [{ automationEnabled: false }, 'automation_off'],
    [{ suppressed: true }, 'unsubscribed'],
    [{ hasBookedMeeting: true }, 'booked'],
    [{ status: 'qualified' }, 'stage_advanced'],
  ] as const)('stops when %o', (override, reason) => {
    expect(shouldContinue({ ...base, ...override })).toEqual({ ok: false, reason });
  });
});
