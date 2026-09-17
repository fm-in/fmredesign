import { describe, it, expect } from 'vitest';
import { blankContactDetails, safeErrorLog, safeErrorMessage } from '../safe-log';

describe('blankContactDetails', () => {
  it.each([
    'priya@example.com',
    'Priya.Shah+leads@mehta-foods.co.in',
    '<priya@example.com>',
  ])('blanks the email address in "%s"', (address) => {
    const text = blankContactDetails(`insert failed for ${address}.`);
    expect(text).toMatch(/\[address\]/);
    expect(text).not.toContain('@');
  });

  it.each(['+91 98332 57659', '98332 57659', '+919833257659', '9833257659', '(022) 2345-6789', '098-332-57659'])(
    'blanks the phone number "%s"',
    (phone) => {
      const text = blankContactDetails(`Failing row contains (lead_mfk2a9_x1y2z, Priya Shah, ${phone}, new).`);
      expect(text).toContain('[phone]');
      expect(text.replace(/\D/g, '')).not.toContain(phone.replace(/\D/g, ''));
      expect(text).toContain('lead_mfk2a9_x1y2z');
    }
  );

  it('keeps what a log needs: error codes, short numbers, timestamps and ids', () => {
    const text = 'code 23505 at 2026-09-17T06:00:00.000Z for lead_mfk2a9_x1y2z: 3 of 25 seats, amount 29999';
    expect(blankContactDetails(text)).toBe(text);
  });
});

describe('safeErrorMessage', () => {
  it('reads a PostgREST error object, an Error and a string', () => {
    expect(safeErrorMessage({ code: 'XX000', message: 'failed for priya@example.com' })).toBe('failed for [address]');
    expect(safeErrorMessage(new Error('failed for +91 98332 57659'))).toBe('failed for [phone]');
    expect(safeErrorMessage('plain')).toBe('plain');
    expect(safeErrorMessage(undefined)).toBe('unknown error');
  });
});

describe('safeErrorLog', () => {
  it('keeps the code and a blanked message, never details or hint', () => {
    const error = {
      code: '23502',
      message: 'null value in column "company" of relation "leads" violates not-null constraint',
      details: 'Failing row contains (lead_1, Priya Shah, priya@example.com, 98332 57659).',
      hint: 'priya@example.com',
    };
    const logged = safeErrorLog(error);
    expect(logged).toEqual({ code: '23502', message: error.message });
    expect(JSON.stringify(logged)).not.toMatch(/priya|98332/);
  });

  it('omits the code when there is none', () => {
    expect(safeErrorLog(new Error('boom for priya@example.com'))).toEqual({ message: 'boom for [address]' });
  });
});
