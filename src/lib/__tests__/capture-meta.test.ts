import { describe, it, expect } from 'vitest';
import { captureMeta, isMissingColumnError } from '../capture-meta';

function req(headers: Record<string, string>): Request {
  return new Request('https://freakingminds.in/api/leads', { headers });
}

describe('captureMeta', () => {
  it('takes the client IP from the first x-forwarded-for entry', () => {
    const meta = captureMeta(req({ 'x-forwarded-for': '203.0.113.9, 70.41.3.18, 150.172.238.178' }));
    expect(meta.ip_address).toBe('203.0.113.9');
  });

  it('falls back to x-real-ip', () => {
    expect(captureMeta(req({ 'x-real-ip': '198.51.100.4' })).ip_address).toBe('198.51.100.4');
  });

  it('stores NULL rather than the string "unknown" when no IP is present', () => {
    // 'unknown' is getClientIp's sentinel. Persisting it would make the column
    // look populated while carrying no information.
    expect(captureMeta(req({})).ip_address).toBeNull();
  });

  it('records the user-agent', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
    expect(captureMeta(req({ 'user-agent': ua })).user_agent).toBe(ua);
  });

  it('stores NULL when no user-agent is sent', () => {
    expect(captureMeta(req({})).user_agent).toBeNull();
  });

  it('preserves a malformed user-agent verbatim — the deformity IS the signal', () => {
    // A known bot fleet is identifiable only by the stray leading quote.
    // Any normalising here would erase the one thing that identifies it.
    const hostile = '"Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/119.0.0.0';
    expect(captureMeta(req({ 'user-agent': hostile })).user_agent).toBe(hostile);
  });

  it('caps an oversized user-agent instead of rejecting the submission', () => {
    const meta = captureMeta(req({ 'user-agent': 'A'.repeat(4000) }));
    expect(meta.user_agent).toHaveLength(512);
  });
});

describe('isMissingColumnError', () => {
  it('detects the PostgREST schema-cache code', () => {
    expect(isMissingColumnError({ code: 'PGRST204' })).toBe(true);
  });

  it('detects the message PostgREST returns for an absent column', () => {
    expect(
      isMissingColumnError({
        message: "Could not find the 'ip_address' column of 'leads' in the schema cache",
      })
    ).toBe(true);
  });

  it('does NOT swallow unrelated database errors', () => {
    // A genuine failure must still throw — otherwise the retry would mask
    // real breakage and silently write rows without metadata forever.
    expect(isMissingColumnError({ code: '23505', message: 'duplicate key value' })).toBe(false);
    expect(isMissingColumnError({ code: '23503', message: 'foreign key violation' })).toBe(false);
    expect(isMissingColumnError(null)).toBe(false);
    expect(isMissingColumnError(undefined)).toBe(false);
    expect(isMissingColumnError('some string')).toBe(false);
  });
});
