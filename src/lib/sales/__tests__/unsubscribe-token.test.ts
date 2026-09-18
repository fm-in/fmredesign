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

  it('rejects a tampered, truncated or malformed token', () => {
    const token = signUnsubscribeToken('priya@example.com');
    const bytes = Buffer.from(token, 'base64url');

    const tamperedCiphertext = Buffer.from(bytes);
    tamperedCiphertext[tamperedCiphertext.length - 1] ^= 1;
    const tamperedTag = Buffer.from(bytes);
    tamperedTag[12] ^= 1;

    expect(verifyUnsubscribeToken(tamperedCiphertext.toString('base64url'))).toBeNull();
    expect(verifyUnsubscribeToken(tamperedTag.toString('base64url'))).toBeNull();
    expect(verifyUnsubscribeToken(bytes.subarray(0, 20).toString('base64url'))).toBeNull();
    expect(verifyUnsubscribeToken('not a token!')).toBeNull();
    expect(verifyUnsubscribeToken('')).toBeNull();
  });

  it('rejects a token issued with another secret, or when no secret is set', () => {
    const token = signUnsubscribeToken('priya@example.com');
    process.env.SALES_LINK_SECRET = 'a-different-secret-entirely';
    expect(verifyUnsubscribeToken(token)).toBeNull();
    delete process.env.SALES_LINK_SECRET;
    expect(verifyUnsubscribeToken(token)).toBeNull();
  });

  it('reveals neither the email nor its base64url form', () => {
    const email = 'priya@example.com';
    const token = signUnsubscribeToken(email);
    expect(token).not.toContain(email);
    expect(token).not.toContain('priya');
    expect(token).not.toContain(Buffer.from(email, 'utf8').toString('base64url'));
    expect(signUnsubscribeToken(email)).not.toBe(token);
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
