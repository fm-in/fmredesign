import { describe, it, expect } from 'vitest';
import { getRolePermissions, normalizeMobileNumber } from '../supabase-utils';

describe('normalizeMobileNumber', () => {
  it('returns empty string for empty input', () => {
    expect(normalizeMobileNumber('')).toBe('');
  });

  it('preserves already-normalized +91 numbers', () => {
    expect(normalizeMobileNumber('+919876543210')).toBe('+919876543210');
  });

  it('adds + prefix to 91XXXXXXXXXX format', () => {
    expect(normalizeMobileNumber('919876543210')).toBe('+919876543210');
  });

  it('adds +91 prefix to 10-digit numbers', () => {
    expect(normalizeMobileNumber('9876543210')).toBe('+919876543210');
  });

  it('strips non-digit characters', () => {
    expect(normalizeMobileNumber('+91 987-654-3210')).toBe('+919876543210');
  });

  it('strips spaces and dashes from 10-digit', () => {
    expect(normalizeMobileNumber('987 654 3210')).toBe('+919876543210');
  });

  it('returns cleaned string for unrecognized formats', () => {
    expect(normalizeMobileNumber('12345')).toBe('12345');
  });
});

describe('getRolePermissions', () => {
  it('grants sales access to managers, admins and super admins', () => {
    for (const role of ['manager', 'admin', 'super_admin']) {
      expect(getRolePermissions(role)).toEqual(expect.arrayContaining(['sales.read', 'sales.write']));
    }
  });

  it('does not grant sales access to editors or viewers', () => {
    expect(getRolePermissions('editor')).not.toContain('sales.read');
    expect(getRolePermissions('viewer')).not.toContain('sales.read');
  });
});
