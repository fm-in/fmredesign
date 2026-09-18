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

  it('omits the code when there is none, and the generic "Error" name', () => {
    expect(safeErrorLog(new Error('boom for priya@example.com'))).toEqual({ message: 'boom for [address]' });
  });

  it("keeps a Resend error's name and a specific Error subclass's name", () => {
    expect(safeErrorLog({ name: 'validation_error', message: 'Invalid `to` field: priya@example.com' })).toEqual({
      name: 'validation_error',
      message: 'Invalid `to` field: [address]',
    });
    expect(safeErrorLog(new TypeError('fetch failed'))).toEqual({ name: 'TypeError', message: 'fetch failed' });
  });

  it('handles a circular error object without throwing, and its result serialises', () => {
    const circular: Record<string, unknown> = { code: 'XX000', message: 'failed for priya@example.com', details: 'Failing row contains (98332 57659)' };
    circular.self = circular;
    circular.cause = { parent: circular };

    const logged = safeErrorLog(circular);

    expect(logged).toEqual({ code: 'XX000', message: 'failed for [address]' });
    expect(() => JSON.stringify(logged)).not.toThrow();
  });

  it('handles objects and values without a message', () => {
    expect(safeErrorLog({ code: 'PGRST000' })).toEqual({ code: 'PGRST000', message: 'unknown error' });
    expect(safeErrorLog({ details: 'priya@example.com' })).toEqual({ message: 'unknown error' });
    expect(safeErrorLog({ message: 42 })).toEqual({ message: 'unknown error' });
    expect(safeErrorLog(null)).toEqual({ message: 'unknown error' });
    expect(safeErrorLog(404)).toEqual({ message: 'unknown error' });
    expect(safeErrorMessage(Object.create(null))).toBe('unknown error');
  });
});
