import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isUnsubscribeConfigured,
  signUnsubscribeToken,
  unsubscribeUrl,
  verifyUnsubscribeToken,
} from '../unsubscribe-token';

describe('unsubscribe tokens', () => {
  beforeEach(() => {
    process.env.SALES_LINK_SECRET = 'test-secret-with-enough-length';
  });
  afterEach(() => {
    delete process.env.SALES_LINK_SECRET;
  });

  it('round-trips a lowercased email', () => {
    expect(verifyUnsubscribeToken(signUnsubscribeToken('Priya@Example.com'))).toBe('priya@example.com');
  });

  it('rejects a tampered payload or signature', () => {
    const token = signUnsubscribeToken('priya@example.com');
    const [payload, signature] = token.split('.');
    const otherPayload = Buffer.from('attacker@example.com').toString('base64url');
    expect(verifyUnsubscribeToken(`${otherPayload}.${signature}`)).toBeNull();
    expect(verifyUnsubscribeToken(`${payload}.${signature.slice(0, -2)}xx`)).toBeNull();
    expect(verifyUnsubscribeToken('no-dot-here')).toBeNull();
  });

  it('builds a link to the unsubscribe page', () => {
    expect(unsubscribeUrl('priya@example.com')).toMatch(/\/unsubscribe\?t=/);
  });

  it('reports whether a secret is configured', () => {
    expect(isUnsubscribeConfigured()).toBe(true);
    delete process.env.SALES_LINK_SECRET;
    expect(isUnsubscribeConfigured()).toBe(false);
    expect(() => signUnsubscribeToken('p@x.com')).toThrow(/SALES_LINK_SECRET/);
  });
});
