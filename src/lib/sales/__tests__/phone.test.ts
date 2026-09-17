import { describe, it, expect } from 'vitest';
import { toE164 } from '../phone';

describe('toE164', () => {
  it.each([
    ['98332 57659', '+919833257659'],
    ['+91-98332-57659', '+919833257659'],
    ['0091 9833257659', '+919833257659'],
    ['09833257659', '+919833257659'],
    ['919833257659', '+919833257659'],
    ['+44 7700 900123', '+447700900123'],
    ['447700900123', '+447700900123'],
  ])('normalises %s', (input, expected) => {
    expect(toE164(input)).toBe(expected);
  });

  it.each([['12345'], [''], ['abc'], ['123456789']])('rejects %s', (input) => {
    expect(toE164(input)).toBeNull();
  });

  it('handles null and undefined', () => {
    expect(toE164(null)).toBeNull();
    expect(toE164(undefined)).toBeNull();
  });
});
