import { describe, it, expect } from 'vitest';
import { escapeSearchTerm, MAX_SEARCH_LENGTH } from '../postgrest';

describe('escapeSearchTerm', () => {
  it('leaves ordinary terms alone', () => {
    expect(escapeSearchTerm('acme')).toBe('acme');
    expect(escapeSearchTerm('first_last@x.com')).toBe('first_last@x.com');
  });

  it('removes characters that change the .or() expression', () => {
    expect(escapeSearchTerm('a,b')).toBe('a b');
    expect(escapeSearchTerm('x),id.eq.1')).toBe('x id.eq.1');
    expect(escapeSearchTerm('"quoted"')).toBe('quoted');
    expect(escapeSearchTerm('100%')).toBe('100');
    expect(escapeSearchTerm('a*b')).toBe('a b');
  });

  it('caps length and trims', () => {
    expect(escapeSearchTerm('x'.repeat(500))).toHaveLength(MAX_SEARCH_LENGTH);
    expect(escapeSearchTerm('   ')).toBe('');
  });
});
