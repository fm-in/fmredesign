import { describe, it, expect } from 'vitest';
import { escapeSearchTerm, likeLiteral, MAX_SEARCH_LENGTH } from '../postgrest';

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

describe('likeLiteral', () => {
  it('escapes the LIKE wildcards and the escape character, so the pattern matches only the value', () => {
    expect(likeLiteral('priya_shah@example.com')).toBe('priya\\_shah@example.com');
    expect(likeLiteral('100%real@example.com')).toBe('100\\%real@example.com');
    expect(likeLiteral('back\\slash@example.com')).toBe('back\\\\slash@example.com');
  });

  it('leaves every other character alone', () => {
    expect(likeLiteral('Priya.Shah+leads@mehta-foods.co.in')).toBe('Priya.Shah+leads@mehta-foods.co.in');
  });
});
